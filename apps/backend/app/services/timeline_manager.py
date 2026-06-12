"""Unified timeline state manager — single source of truth for all reads/writes.

All timeline access (agent tools, REST API, WebSocket broadcasts) MUST go through
this manager. It holds one in-memory AgentState per project, protected by an
asyncio.Lock to prevent concurrent writes between agents and the frontend.

It also keeps a bounded in-memory history of saved versions per project so both
users (REST) and external agents (undo_timeline tool) can undo/redo changes.
"""

from __future__ import annotations

import asyncio
import json
import logging
from copy import deepcopy
from pathlib import Path

from app.agent.state import AgentState
from app.config import settings
from app.models.timeline import TimelineProject, migrate_project_data
from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

MAX_HISTORY = 30


class TimelineManager:
    def __init__(self) -> None:
        self._states: dict[str, AgentState] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        # Saved-version snapshots per project. Last element == current saved state.
        self._history: dict[str, list[TimelineProject]] = {}
        self._redo: dict[str, list[TimelineProject]] = {}

    # ── helpers ──────────────────────────────────────

    def _projects_dir(self) -> Path:
        d = Path(settings.projects_dir)
        d.mkdir(parents=True, exist_ok=True)
        return d

    def lock_for(self, project_id: str) -> asyncio.Lock:
        """Public per-project lock. All multi-step read-modify-write sequences
        (tool gateway, frontend updates) must run inside this lock."""
        if project_id not in self._locks:
            self._locks[project_id] = asyncio.Lock()
        return self._locks[project_id]

    # Backwards-compatible alias
    _lock_for = lock_for

    def _load_from_disk(self, project_id: str) -> TimelineProject | None:
        path = self._projects_dir() / f"{project_id}.json"
        if not path.exists():
            return None
        try:
            data = migrate_project_data(json.loads(path.read_text()))
            return TimelineProject(**data)
        except Exception as e:
            logger.warning(f"Failed to load timeline for {project_id}: {e}")
            return None

    def _save_to_disk(self, state: AgentState) -> None:
        if not state.current_timeline:
            return
        path = self._projects_dir() / f"{state.project_id}.json"
        tmp = path.with_suffix(".json.tmp")
        tmp.write_text(state.current_timeline.model_dump_json(indent=2))
        tmp.replace(path)

    def _push_history(self, project_id: str, timeline: TimelineProject) -> None:
        hist = self._history.setdefault(project_id, [])
        hist.append(deepcopy(timeline))
        if len(hist) > MAX_HISTORY:
            del hist[0 : len(hist) - MAX_HISTORY]

    # ── public API ───────────────────────────────────

    def get_state(self, project_id: str) -> AgentState:
        """Get or create the in-memory state for a project.

        On first access, loads timeline from disk and seeds the history.
        Subsequent calls return the same in-memory instance.
        """
        if project_id not in self._states:
            state = AgentState(project_id=project_id)
            timeline = self._load_from_disk(project_id)
            if timeline:
                state.current_timeline = timeline
                self._push_history(project_id, timeline)
            self._states[project_id] = state
        return self._states[project_id]

    def sync_from_disk(self, project_id: str) -> None:
        """Reload timeline from disk into the in-memory state.

        Called at the start of each agent run so the agent always sees
        the latest version (including any frontend edits since last run).

        Skipped when the in-memory state carries unpersisted tool edits
        (persist=False gateway calls) — reloading would silently drop them.
        """
        state = self.get_state(project_id)
        if state.gateway_dirty:
            logger.debug(
                f"sync_from_disk skipped for {project_id}: unpersisted gateway edits"
            )
            return
        timeline = self._load_from_disk(project_id)
        if timeline:
            state.current_timeline = timeline

    async def save_and_broadcast(self, project_id: str, record_history: bool = True) -> int:
        """Persist current timeline to disk, bump version, broadcast via WS.

        This is the ONE place where timeline is written. Both agent tools
        and the REST API call this method.

        Returns the new version number.
        """
        state = self.get_state(project_id)
        if not state.current_timeline:
            return state.version

        version = state.bump_version()
        self._save_to_disk(state)
        state.gateway_dirty = False
        if record_history:
            self._push_history(project_id, state.current_timeline)
            self._redo[project_id] = []
        await ws_manager.broadcast_timeline(
            project_id, state.current_timeline.model_dump(), version=version,
        )
        return version

    async def update_from_frontend(
        self, project_id: str, timeline: TimelineProject
    ) -> int:
        """Apply a frontend edit. Acquires lock, rejects if agent is active.

        Returns the new version number.
        Raises ValueError if agent is currently active.
        """
        async with self.lock_for(project_id):
            state = self.get_state(project_id)
            if state.agent_active:
                raise ValueError("Agent is currently modifying the timeline.")
            state.current_timeline = timeline
            return await self.save_and_broadcast(project_id)

    # ── history / undo / redo ────────────────────────

    def history_info(self, project_id: str) -> dict:
        """How many saved versions can be undone / redone."""
        hist = self._history.get(project_id, [])
        redo = self._redo.get(project_id, [])
        return {
            "undo_available": max(0, len(hist) - 1),
            "redo_available": len(redo),
        }

    def undo_unlocked(self, project_id: str) -> bool:
        """Restore the previous saved version into memory. Caller must hold the
        project lock and persist afterwards (with record_history=False)."""
        state = self.get_state(project_id)
        hist = self._history.get(project_id, [])
        if len(hist) < 2:
            return False
        current = hist.pop()
        self._redo.setdefault(project_id, []).append(current)
        state.current_timeline = deepcopy(hist[-1])
        return True

    def redo_unlocked(self, project_id: str) -> bool:
        """Re-apply the most recently undone version into memory. Caller must
        hold the project lock and persist afterwards (record_history=False)."""
        state = self.get_state(project_id)
        redo = self._redo.get(project_id, [])
        if not redo:
            return False
        restored = redo.pop()
        self._history.setdefault(project_id, []).append(restored)
        state.current_timeline = deepcopy(restored)
        return True

    async def undo(self, project_id: str) -> int | None:
        """Restore the previously saved version. Returns new version or None."""
        async with self.lock_for(project_id):
            state = self.get_state(project_id)
            if state.agent_active:
                raise ValueError("Agent is currently modifying the timeline.")
            if not self.undo_unlocked(project_id):
                return None
            return await self.save_and_broadcast(project_id, record_history=False)

    async def redo(self, project_id: str) -> int | None:
        """Re-apply the most recently undone version. Returns new version or None."""
        async with self.lock_for(project_id):
            state = self.get_state(project_id)
            if state.agent_active:
                raise ValueError("Agent is currently modifying the timeline.")
            if not self.redo_unlocked(project_id):
                return None
            return await self.save_and_broadcast(project_id, record_history=False)

    def project_exists(self, project_id: str) -> bool:
        path = self._projects_dir() / f"{project_id}.json"
        return path.exists()

    def create_project(self, project_id: str, timeline: TimelineProject) -> None:
        """Create a new project on disk and in memory."""
        state = AgentState(project_id=project_id)
        state.current_timeline = timeline
        self._states[project_id] = state
        self._save_to_disk(state)
        self._history[project_id] = [deepcopy(timeline)]
        self._redo[project_id] = []


# Module-level singleton
timeline_manager = TimelineManager()
