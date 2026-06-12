"""Provider-neutral tool gateway for external coding agents (no API key needed).

External agents (Claude Code, Cursor, ...) drive the editor through this
gateway: discover tool schemas, execute one tool call at a time, and let the
backend validate, persist, and broadcast timeline changes to the UI.

Concurrency: every execution runs inside the per-project lock so gateway
calls, frontend saves, and the built-in agent never interleave writes.
"""

from __future__ import annotations

import json
from copy import deepcopy
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.timeline import TimelineProject
from app.services.timeline_manager import timeline_manager
from app.services.timeline_validator import validate_timeline
from app.services.ws_manager import ws_manager
from app.tools.bootstrap import (
    QUIET_TOOLS,
    TIMELINE_MODIFYING_TOOLS,
    ensure_tools_registered,
)
from app.tools.registry import registry

router = APIRouter()


class ToolExecuteRequest(BaseModel):
    project_id: str = "default"
    args: dict[str, Any] = Field(default_factory=dict)
    media_dir: str | None = None
    persist: bool = True


def _summarize_result(result: dict) -> str:
    try:
        return json.dumps(result, ensure_ascii=False)[:300]
    except (TypeError, ValueError):
        return str(result)[:300]


@router.get("")
async def list_tools():
    """List all backend editing tools and their JSON schemas."""
    ensure_tools_registered()
    return {
        "tools": registry.as_tool_defs(),
        "timeline_modifying_tools": sorted(TIMELINE_MODIFYING_TOOLS),
    }


@router.post("/{tool_name}/execute")
async def execute_tool(tool_name: str, req: ToolExecuteRequest):
    """Execute one registered tool against a project state (serialized per project)."""
    ensure_tools_registered()
    if tool_name not in registry.tool_names:
        raise HTTPException(status_code=404, detail=f"Unknown tool: {tool_name}")

    async with timeline_manager.lock_for(req.project_id):
        state = timeline_manager.get_state(req.project_id)
        if state.agent_active:
            raise HTTPException(
                status_code=409,
                detail="Built-in agent is currently modifying this project. Retry when it finishes.",
            )
        timeline_manager.sync_from_disk(req.project_id)
        if req.media_dir:
            state.media_dir = req.media_dir

        modifies_timeline = tool_name in TIMELINE_MODIFYING_TOOLS
        announce = tool_name not in QUIET_TOOLS
        snapshot: TimelineProject | None = (
            deepcopy(state.current_timeline) if state.current_timeline else None
        )

        if announce:
            await ws_manager.broadcast_tool_activity(
                req.project_id, phase="started", tool_name=tool_name, args=req.args,
            )

        result = await registry.execute(tool_name, req.args, state)
        if not isinstance(result, dict):
            result = {"result": result}
        skip_history = bool(result.pop("_skip_history", False))

        if "error" in result:
            if modifies_timeline:
                state.current_timeline = snapshot
            if announce:
                await ws_manager.broadcast_tool_activity(
                    req.project_id,
                    phase="failed",
                    tool_name=tool_name,
                    summary=str(result.get("error", ""))[:300],
                )
            return {
                "ok": False,
                "tool": tool_name,
                "project_id": req.project_id,
                "result": result,
            }

        version = state.version
        if modifies_timeline and state.current_timeline:
            errors = validate_timeline(state.current_timeline)
            if errors:
                state.current_timeline = snapshot
                if announce:
                    await ws_manager.broadcast_tool_activity(
                        req.project_id,
                        phase="failed",
                        tool_name=tool_name,
                        summary=f"invalid timeline: {'; '.join(errors)[:240]}",
                    )
                raise HTTPException(
                    status_code=422,
                    detail={"message": "Tool produced an invalid timeline", "errors": errors},
                )
            if req.persist:
                version = await timeline_manager.save_and_broadcast(
                    req.project_id, record_history=not skip_history
                )
            else:
                state.gateway_dirty = True

        if announce:
            await ws_manager.broadcast_tool_activity(
                req.project_id,
                phase="succeeded",
                tool_name=tool_name,
                summary=_summarize_result(result),
                version=version,
            )

        return {
            "ok": True,
            "tool": tool_name,
            "project_id": req.project_id,
            "version": version,
            "timeline_persisted": bool(modifies_timeline and req.persist),
            "result": result,
        }
