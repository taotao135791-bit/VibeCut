"""Director-grade planning helpers.

This module deliberately stays provider-neutral: it turns a user brief and the
known timeline/media state into a structured edit plan that any coding agent can
inspect before touching the timeline.
"""

from __future__ import annotations

from typing import Any

from app.models.timeline import TimelineProject


DEFAULT_PROMO_VISUAL_PACK = {
    "id": "dynamic_director_pack",
    "pattern": "director_note_driven",
    "style": "derived from brand — NOT preset",
    "note": "DO NOT USE THIS AS-IS. The agent MUST override these tokens based on the Director's Note (Layer 1.5 in prompt). If you see these default values in output, the system failed to personalize.",
    "tokens": {
        "background": "DERIVE_FROM_BRAND",
        "primary": "DERIVE_FROM_BRAND",
        "secondary": "DERIVE_FROM_BRAND",
        "accent": "DERIVE_FROM_BRAND",
        "text": "#F8FAFC",
    },
    "typography": {
        "heading": "DERIVE_FROM_BRAND (NOT Inter — impeccable overused-font ban)",
        "body": "Outfit or brand font",
        "rules": [
            "Font choice derived from brand DNA, NOT defaulted.",
            "Type scale: headline/sub ratio >= 1.25 (taste-skill).",
            "Never use Inter/Roboto/Geist unless brand literally uses them (impeccable).",
        ],
    },
    "motion": {
        "entry_ms": 480,
        "exit_ms": 360,
        "curve": "power4.out for position, elastic ONLY for scale overshoot (impeccable bounce-easing ban)",
        "anti_patterns": [
            "bounce/elastic on position (impeccable)",
            "glow on every element (impeccable dark-glow)",
            "same layout repeated (taste-skill Section-Layout-Repetition Ban)",
            "equal chapter durations (impeccable monotonous-spacing)",
            "5 uniform ColorBlockWipes (taste-skill TRANSITION VARIETY)",
        ],
    },
    "structural_archetypes": [
        "A) SLOW BURN: 1 long intro (8s) + rapid-fire middle (3x2s) + contemplative outro (6s)",
        "B) COLD OPEN: immediate content, 4 unequal chapters, hard cuts",
        "C) CRESCENDO: 5 chapters of increasing intensity (each shorter)",
        "D) DIPTYCH: 2 equal halves with dramatic pivot at center",
        "E) PULSE: alternating content/silence, 8+ micro-chapters",
        "F) EDITORIAL: 3 long chapters, heavy typography, no transitions",
    ],
}


def _asset_duration(asset: Any) -> float:
    duration = getattr(asset, "duration_sec", None)
    try:
        return max(0.0, float(duration or 0))
    except (TypeError, ValueError):
        return 0.0


def _classify_asset(asset: Any) -> str:
    name = str(getattr(asset, "path", "")).lower()
    media_type = getattr(asset, "type", "")
    if media_type == "image":
        if any(token in name for token in ("price", "pricing", "plan", "card", "image")):
            return "price_card_image"
        return "static_image"
    if media_type == "video":
        if any(token in name for token in ("talk", "avatar", "person", "口播", "数字人", "真人")):
            return "talking_head_video"
        if any(token in name for token in ("ui", "screen", "demo", "app")):
            return "ui_demo_video"
        return "creative_product_video"
    if media_type == "audio":
        return "audio"
    return "unknown"


def _duration_bucket(total_duration: float) -> str:
    if total_duration <= 8:
        return "short_social_cut"
    if total_duration <= 20:
        return "standard_ad_cut"
    if total_duration <= 45:
        return "full_remix_cut"
    return "long_source_needs_selective_cutdown"


def _pct_scene(scene_id: str, start_pct: float, end_pct: float, purpose: str, component_effects: list[str], copy_priority: list[str]) -> dict:
    return {
        "id": scene_id,
        "start_pct": start_pct,
        "end_pct": end_pct,
        "purpose": purpose,
        "component_effects": component_effects,
        "copy_priority": copy_priority,
    }


def _build_reusable_recipe(has_talking_head: bool, has_price_card: bool, has_video: bool, total_duration: float) -> dict:
    """Generic ad-remix recipe using normalized time instead of fixed seconds."""

    duration_bucket = _duration_bucket(total_duration)
    if not has_video and has_price_card:
        scenes = [
            _pct_scene("offer_first_card", 0.0, 0.45, "Make the discount undeniable immediately.", ["offer_stage"], ["{{discount}}"]),
            _pct_scene("price_proof", 0.30, 0.78, "Show membership price and model-rate proof.", ["pricing_stage", "model_rate_grid"], ["{{tier_1_price}}", "{{tier_2_price}}"]),
            _pct_scene("cta_close", 0.72, 1.0, "Close with concise CTA.", ["cta_badge"], ["{{cta_text}}"]),

        ]
    elif has_talking_head:
        scenes = [
            _pct_scene("reaction_hook", 0.0, 0.16, "Use the person's reaction as the emotional hook.", ["reaction_sticker", "promo_top_bar"], ["{{discount}}"]),
            _pct_scene("proof_or_function", 0.16, 0.62, "Let speech or product footage carry proof; keep overlays off faces.", ["countdown_banner"], ["{{date_window}}"]),
            _pct_scene("offer_stack", 0.62, 0.86, "Bring price and model rates back after proof.", ["price_badge", "model_rate_grid"], ["{{tier_1_price}}", "{{rates_summary}}"]),
            _pct_scene("cta_close", 0.86, 1.0, "End with a purchase/creation CTA.", ["cta_badge"], ["{{cta_text}}"]),

        ]
    else:
        scenes = [
            _pct_scene("instant_offer_hook", 0.0, 0.14, "Open with a full-page offer stage before returning to source footage.", ["offer_stage"], ["{{discount}} — {{headline}}"]),
            _pct_scene("urgency_window", 0.14, 0.40, "Show the date window and countdown while source footage breathes.", ["countdown_banner"], ["{{date_window}}"]),
            _pct_scene("value_proof", 0.40, 0.72, "Add membership or model-rate proof only after the hook lands.", ["price_badge", "model_rate_grid"], ["{{tier_1_price}}", "{{tier_2_price}}"]),
            _pct_scene("cta_close", 0.72, 1.0, "Close with a compact CTA and avoid new information overload.", ["cta_badge"], ["{{final_cta_text}}"]),

        ]

    return {
        "duration_bucket": duration_bucket,
        "normalized_scenes": scenes,
        "placement_rules": {
            "top_bar": {"anchor": "top", "safe_area": 0.04, "max_width": 0.86, "avoid": ["existing_top_nav", "face_forehead"]},
            "reaction_sticker": {"anchor": "bottom_left", "safe_area": 0.05, "max_width": 0.44, "avoid": ["mouth", "face_center", "subtitles"]},
            "countdown_banner": {"anchor": "top_right", "safe_area": 0.05, "max_width": 0.36, "avoid": ["primary_subject", "existing_caption"]},
            "model_rate_grid": {"anchor": "right", "safe_area": 0.05, "max_width": 0.36, "avoid": ["price_numbers", "cta_buttons"]},
            "cta_badge": {"anchor": "bottom_right", "safe_area": 0.05, "max_width": 0.44, "avoid": ["subtitles", "product_detail"]},
        },
        "generation_rules": [
            "First inspect media duration and aspect ratio; never assume a 5 second source.",
            "If analysis files exist, reuse them; otherwise analyze video/image before choosing exact effect times.",
            "Convert normalized scene percentages to actual seconds from the source duration.",
            "For talking-head footage, keep overlays away from face center and mouth.",
            "For product/UI footage, place price components over low-detail negative space.",
            "If no talking-head asset exists, simulate the reaction hook with text but mark the missing input.",
            "Run visual QA after edits; revise any safe-area or long-copy warning.",
        ],
    }


def build_creative_plan(timeline: TimelineProject | None, brief: str) -> dict:
    """Build a deterministic director plan skeleton from current context."""
    media = timeline.media_pool if timeline else []
    total_duration = sum(_asset_duration(asset) for asset in media if getattr(asset, "type", "") in {"video", "image"})
    assets = [
        {
            "id": asset.id,
            "type": asset.type,
            "path": asset.path,
            "classification": _classify_asset(asset),
            "duration_sec": asset.duration_sec,
            "reuse_role": (
                "primary_story"
                if _classify_asset(asset) in {"talking_head_video", "creative_product_video", "ui_demo_video"}
                else "proof_or_offer_card"
                if _classify_asset(asset) == "price_card_image"
                else "supporting_asset"
            ),
        }
        for asset in media
    ]

    has_talking_head = any(a["classification"] == "talking_head_video" for a in assets)
    has_price_card = any(a["classification"] == "price_card_image" for a in assets)
    has_video = any(a["type"] == "video" for a in assets)

    scenes: list[dict] = []
    cursor = 0.0
    if has_video:
        scenes.append(
            {
                "id": "scene_hook_offer",
                "start_sec": cursor,
                "end_sec": cursor + 3.0,
                "purpose": "Open with the strongest discount hook before feature detail.",
                "media_intent": "creative_product_video" if not has_talking_head else "talking_head_video",
                "fullscreen_effects": ["speed_lines_or_flash_on_offer_reveal"],
                "component_effects": ["promo_top_bar", "price_badge"],
                "copy_priority": ["{{discount}}", "{{headline}}"],
                "avoid_regions": ["center_product_or_face"],
            }
        )
        cursor += 3.0
        scenes.append(
            {
                "id": "scene_window_countdown",
                "start_sec": cursor,
                "end_sec": cursor + 5.0,
                "purpose": "Turn urgency into a visible time window.",
                "media_intent": "creative_product_video",
                "fullscreen_effects": ["subtle_flash_at_transition"],
                "component_effects": ["countdown_banner"],
                "copy_priority": ["{{date_window}}"],
                "avoid_regions": ["primary_subject", "existing_captions"],
            }
        )
        cursor += 5.0

    if has_price_card:
        scenes.append(
            {
                "id": "scene_price_card",
                "start_sec": cursor,
                "end_sec": cursor + 6.0,
                "purpose": "Use the pricing card as proof; highlight membership tier prices.",
                "media_intent": "price_card_image",
                "fullscreen_effects": ["spotlight_on_price_column"],
                "component_effects": ["promo_top_bar", "model_rate_grid", "cta_badge"],
                "copy_priority": ["{{tier_1_price}}", "{{tier_2_price}}", "{{rates_summary}}"],
                "avoid_regions": ["do_not_cover_price_numbers", "do_not_cover_primary_cta"],
            }
        )
        cursor += 6.0

    if not scenes:
        scenes.append(
            {
                "id": "scene_offer_card",
                "start_sec": 0,
                "end_sec": 6,
                "purpose": "Create an offer-first promotional card from the brief.",
                "media_intent": "generated_or_static_offer",
                "fullscreen_effects": ["none"],
                "component_effects": ["promo_top_bar", "price_badge", "countdown_banner"],
                "copy_priority": ["{{discount}}", "{{cta_text}}"],
                "avoid_regions": ["safe_area_edges"],
            }
        )

    qa_checks = [
        "Discount number is readable within the first 1.5 seconds.",
        "Offer time window is visible for at least 2 seconds.",
        "Component overlays do not cover faces, product hero, price numbers, or CTA buttons.",
        "Every effect clip has an editable text field when it contains copy.",
        "Snapshot frames are checked at each scene midpoint and transition.",
    ]

    return {
        "brief": brief,
        "assets": assets,
        "director_read": {
            "primary_path": "talking_head_reaction" if has_talking_head else "creative_product_or_price_card",
            "missing_inputs": [] if has_talking_head else ["talking_head_or_avatar_video"],
            "tone": "MUST BE INFERRED FROM BRIEF (taste-skill Section 0: read the room)",
            "visual_system": "MUST BE DERIVED FROM BRAND DNA (NOT a preset)",
            "duration_bucket": _duration_bucket(total_duration),
            "reusability_read": "Use Director's Note framework (prompt Layer 1.5) to pick archetype, gravity map, temperature arc, and texture strategy BEFORE placing any effects.",
            "impeccable_checklist": [
                "Font is NOT Inter/Roboto/Geist (overused-font)",
                "Glow on max 1-2 elements (dark-glow)",
                "No elastic on position (bounce-easing)",
                "Chapter durations are NOT equal (monotonous-spacing)",
                "Backgrounds change across video (ATMOSPHERE EVOLUTION)",
                "Particles NOT full-duration (PARTICLE DISCONTINUITY)",
                "Layout families NOT repeated (Section-Layout-Repetition Ban)",
            ],
        },
        "visual_pack": DEFAULT_PROMO_VISUAL_PACK,
        "adaptive_recipe": _build_reusable_recipe(has_talking_head, has_price_card, has_video, total_duration),
        "scenes": scenes,
        "qa_checks": qa_checks,
    }
