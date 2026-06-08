"""Reusable promo director tools."""

from __future__ import annotations

import json

from app.services.promo_director import draft_promo_remix_timeline
from app.tools.registry import registry


@registry.register(
    name="draft_promo_remix",
    description=(
        "Draft an adaptive promotional remix timeline from the current media_pool. "
        "This is a QUICK-START tool that generates a deterministic baseline using built-in "
        "component types. For truly creative results, use register_creative_pack to create "
        "custom components, then compose the timeline manually with add_clips. "
        "\n\nWhen to use: quick baseline draft when you need a starting point. "
        "When NOT to use: when you want creative freedom (use add_clips + custom pack components instead)."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {
            "brief": {
                "type": "STRING",
                "description": "Campaign brief, slogans, discount window, style notes, and constraints.",
            },
            "copy_pack": {
                "type": "STRING",
                "description": "Optional JSON object overriding copy keys: hook, reaction, countdown, membership, model_rates, price_card, cta, final_cta, image_top.",
            },
            "max_primary_duration_sec": {
                "type": "NUMBER",
                "description": "Optional cap for the primary video source duration. Omit to use full video duration.",
            },
            "append_price_card": {
                "type": "BOOLEAN",
                "description": "Whether to append a detected price-card image after the primary video. Default true.",
            },
            "pack_name": {
                "type": "STRING",
                "description": "Creative pack to use for component_type references. Default: 'builtin-promo'. Custom packs registered via register_creative_pack can be specified here.",
            },
        },
        "required": ["brief"],
    },
)
async def draft_promo_remix(args: dict, state) -> dict:
    if not state.current_timeline:
        return {"error": "No timeline exists. Create/register media first."}
    brief = args.get("brief", "")
    if not isinstance(brief, str) or not brief.strip():
        return {"error": "brief is required"}

    copy_pack = None
    raw_copy = args.get("copy_pack")
    if raw_copy:
        try:
            copy_pack = json.loads(raw_copy) if isinstance(raw_copy, str) else raw_copy
        except json.JSONDecodeError as exc:
            return {"error": f"Invalid copy_pack JSON: {exc}"}

    return draft_promo_remix_timeline(
        state.current_timeline,
        brief,
        copy_pack=copy_pack,
        max_primary_duration_sec=args.get("max_primary_duration_sec"),
        append_price_card=bool(args.get("append_price_card", True)),
    )
