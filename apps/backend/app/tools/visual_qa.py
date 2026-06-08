"""Visual QA tools for timeline edits."""

from __future__ import annotations

from app.services.visual_qa import build_visual_qa_report
from app.tools.registry import registry


@registry.register(
    name="create_visual_qa_report",
    description=(
        "Create a deterministic visual QA report for the current timeline. Use after adding "
        "promotional overlays/effects to get sample times, safe-area warnings, semantic "
        "component coverage, and follow-up checks for screenshot or multimodal review."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {},
    },
)
async def create_visual_qa_report(args: dict, state) -> dict:
    return build_visual_qa_report(state.current_timeline)
