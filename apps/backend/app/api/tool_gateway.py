"""Provider-neutral tool gateway for external coding agents.

This exposes the same editing tools used by the built-in ReAct agent through
plain REST endpoints. External agents can discover tool schemas, execute one
tool call at a time, and let the backend persist/broadcast timeline changes.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.timeline import TimelineProject
from app.services.timeline_manager import timeline_manager
from app.services.timeline_validator import validate_timeline
from app.tools.bootstrap import TIMELINE_MODIFYING_TOOLS, ensure_tools_registered
from app.tools.registry import registry

router = APIRouter()


class ToolExecuteRequest(BaseModel):
    project_id: str = "default"
    args: dict[str, Any] = Field(default_factory=dict)
    media_dir: str | None = None
    persist: bool = True


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
    """Execute one registered tool against a project state."""
    ensure_tools_registered()
    if tool_name not in registry.tool_names:
        raise HTTPException(status_code=404, detail=f"Unknown tool: {tool_name}")

    state = timeline_manager.get_state(req.project_id)
    timeline_manager.sync_from_disk(req.project_id)
    if req.media_dir:
        state.media_dir = req.media_dir

    modifies_timeline = tool_name in TIMELINE_MODIFYING_TOOLS
    snapshot: TimelineProject | None = deepcopy(state.current_timeline) if state.current_timeline else None

    result = await registry.execute(tool_name, req.args, state)
    if "error" in result:
        if modifies_timeline:
            state.current_timeline = snapshot
        return {"tool": tool_name, "project_id": req.project_id, "result": result}

    version = state.version
    if modifies_timeline and state.current_timeline:
        errors = validate_timeline(state.current_timeline)
        if errors:
            state.current_timeline = snapshot
            raise HTTPException(
                status_code=422,
                detail={"message": "Tool produced an invalid timeline", "errors": errors},
            )
        if req.persist:
            version = await timeline_manager.save_and_broadcast(req.project_id)

    return {
        "tool": tool_name,
        "project_id": req.project_id,
        "version": version,
        "timeline_persisted": bool(modifies_timeline and req.persist),
        "result": result,
    }
