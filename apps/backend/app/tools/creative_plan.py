"""Creative planning tools for director-style edits."""

from __future__ import annotations

from app.services.creative_plan import build_creative_plan
from app.tools.registry import registry


@registry.register(
    name="create_creative_plan",
    description=(
        "Create a structured director plan before editing. Use this for promotional, "
        "social, remix, or ad-style work before adding clips/effects. The plan "
        "classifies assets, proposes reusable normalized scenes, assigns full-screen "
        "vs component effects, selects a visual pack, identifies avoid-regions, and "
        "lists visual QA checks. Use the normalized recipe instead of fixed timings "
        "when the user may swap in a different video."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {
            "brief": {
                "type": "STRING",
                "description": "User brief, campaign copy, style notes, constraints, and target platform.",
            },
        },
        "required": ["brief"],
    },
)
async def create_creative_plan(args: dict, state) -> dict:
    brief = args.get("brief", "")
    if not isinstance(brief, str) or not brief.strip():
        return {"error": "brief is required"}
    return {"success": True, "plan": build_creative_plan(state.current_timeline, brief)}
