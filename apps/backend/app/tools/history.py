"""Timeline history tools: undo / redo the last saved change.

The TimelineManager keeps a bounded history of saved versions per project.
These tools let an external agent (or the built-in one) roll the timeline
back/forward — e.g. when the user says "撤销刚才的修改".
"""

from __future__ import annotations

from app.tools.registry import registry


@registry.register(
    name="undo_timeline",
    description=(
        "Undo the last saved timeline change, restoring the previous version. "
        "Each call steps back one saved version (up to ~30). "
        "\n\nWhen to use: the user asks to revert/undo, or your last edit turned out wrong "
        "and recomputing it is harder than rolling back. "
        "When NOT to use: fixing a small mistake you can directly correct with update_clips."
    ),
    parameters={"type": "OBJECT", "properties": {}},
)
async def undo_timeline(args: dict, state) -> dict:
    from app.services.timeline_manager import timeline_manager

    if not timeline_manager.undo_unlocked(state.project_id):
        return {"error": "Nothing to undo — no earlier saved version exists."}
    info = timeline_manager.history_info(state.project_id)
    return {"success": True, "_skip_history": True, **info}


@registry.register(
    name="redo_timeline",
    description=(
        "Redo the most recently undone timeline change. Only available right after "
        "undo_timeline (any new edit clears the redo stack). "
        "\n\nWhen to use: the user asks to re-apply a change that was just undone."
    ),
    parameters={"type": "OBJECT", "properties": {}},
)
async def redo_timeline(args: dict, state) -> dict:
    from app.services.timeline_manager import timeline_manager

    if not timeline_manager.redo_unlocked(state.project_id):
        return {"error": "Nothing to redo."}
    info = timeline_manager.history_info(state.project_id)
    return {"success": True, "_skip_history": True, **info}
