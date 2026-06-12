"""Tests for TimelineManager history / undo / redo."""

import asyncio

from app.models.timeline import TimelineProject, ProjectMeta, Track, Clip, MediaAsset
from app.services.timeline_manager import TimelineManager


def _timeline(name="v1", clip_end=10.0) -> TimelineProject:
    return TimelineProject(
        version="1.0.0",
        project=ProjectMeta(name=name, width=1920, height=1080, fps=30),
        media_pool=[MediaAsset(id="m1", path="/test/v.mp4", type="video", duration_sec=100.0)],
        tracks=[
            Track(
                id="t1",
                name="V",
                type="video",
                clips=[
                    Clip(
                        id="c1",
                        type="video",
                        media_id="m1",
                        source_in_sec=0,
                        source_out_sec=clip_end,
                        timeline_start_sec=0,
                        timeline_end_sec=clip_end,
                    )
                ],
            )
        ],
    )


def _manager(tmp_path, monkeypatch) -> TimelineManager:
    from app.config import settings

    monkeypatch.setattr(settings, "projects_dir", str(tmp_path))
    return TimelineManager()


class TestUndoRedo:
    def test_undo_restores_previous_save(self, tmp_path, monkeypatch):
        mgr = _manager(tmp_path, monkeypatch)
        mgr.create_project("p1", _timeline(clip_end=10.0))

        state = mgr.get_state("p1")
        state.current_timeline = _timeline(clip_end=20.0)
        asyncio.run(mgr.save_and_broadcast("p1"))

        assert mgr.history_info("p1") == {"undo_available": 1, "redo_available": 0}

        version = asyncio.run(mgr.undo("p1"))
        assert version is not None
        assert state.current_timeline.tracks[0].clips[0].timeline_end_sec == 10.0
        assert mgr.history_info("p1") == {"undo_available": 0, "redo_available": 1}

    def test_redo_after_undo(self, tmp_path, monkeypatch):
        mgr = _manager(tmp_path, monkeypatch)
        mgr.create_project("p1", _timeline(clip_end=10.0))
        state = mgr.get_state("p1")
        state.current_timeline = _timeline(clip_end=20.0)
        asyncio.run(mgr.save_and_broadcast("p1"))

        asyncio.run(mgr.undo("p1"))
        version = asyncio.run(mgr.redo("p1"))
        assert version is not None
        assert state.current_timeline.tracks[0].clips[0].timeline_end_sec == 20.0

    def test_new_save_clears_redo(self, tmp_path, monkeypatch):
        mgr = _manager(tmp_path, monkeypatch)
        mgr.create_project("p1", _timeline(clip_end=10.0))
        state = mgr.get_state("p1")
        state.current_timeline = _timeline(clip_end=20.0)
        asyncio.run(mgr.save_and_broadcast("p1"))
        asyncio.run(mgr.undo("p1"))

        state.current_timeline = _timeline(clip_end=30.0)
        asyncio.run(mgr.save_and_broadcast("p1"))
        assert mgr.history_info("p1")["redo_available"] == 0
        assert asyncio.run(mgr.redo("p1")) is None

    def test_undo_with_no_history_returns_none(self, tmp_path, monkeypatch):
        mgr = _manager(tmp_path, monkeypatch)
        mgr.create_project("p1", _timeline())
        assert asyncio.run(mgr.undo("p1")) is None

    def test_undo_blocked_while_agent_active(self, tmp_path, monkeypatch):
        import pytest

        mgr = _manager(tmp_path, monkeypatch)
        mgr.create_project("p1", _timeline(clip_end=10.0))
        state = mgr.get_state("p1")
        state.current_timeline = _timeline(clip_end=20.0)
        asyncio.run(mgr.save_and_broadcast("p1"))

        state.agent_active = True
        with pytest.raises(ValueError):
            asyncio.run(mgr.undo("p1"))

    def test_unpersisted_gateway_edits_survive_sync(self, tmp_path, monkeypatch):
        """sync_from_disk must not clobber persist=False tool edits."""
        mgr = _manager(tmp_path, monkeypatch)
        mgr.create_project("p1", _timeline(clip_end=10.0))
        state = mgr.get_state("p1")

        state.current_timeline = _timeline(clip_end=99.0)
        state.gateway_dirty = True
        mgr.sync_from_disk("p1")
        assert state.current_timeline.tracks[0].clips[0].timeline_end_sec == 99.0

        state.gateway_dirty = False
        mgr.sync_from_disk("p1")
        assert state.current_timeline.tracks[0].clips[0].timeline_end_sec == 10.0

    def test_history_capped(self, tmp_path, monkeypatch):
        from app.services import timeline_manager as tm_module

        mgr = _manager(tmp_path, monkeypatch)
        mgr.create_project("p1", _timeline(clip_end=1.0))
        state = mgr.get_state("p1")
        for i in range(2, tm_module.MAX_HISTORY + 10):
            state.current_timeline = _timeline(clip_end=float(i))
            asyncio.run(mgr.save_and_broadcast("p1"))

        assert len(mgr._history["p1"]) == tm_module.MAX_HISTORY
