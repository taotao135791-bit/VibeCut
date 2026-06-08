"""Reusable promo-remix timeline drafting.

This is intentionally deterministic and provider-neutral. It gives any coding
agent a safe first pass that adapts to the current media pool instead of copying
fixed timestamps from one test video.
"""

from __future__ import annotations

import uuid
from typing import Any

from app.models.timeline import Clip, EffectParams, MediaAsset, TimelineProject, Track, VideoStyle
from app.services.creative_plan import build_creative_plan
from app.services.timeline_validator import validate_timeline
from app.services.visual_qa import build_visual_qa_report


DEFAULT_COPY = {
    "hook": "Lowest Price of the Year: 57% Off!",
    "reaction": "Lowest Discount of the Year: 57% Off\nMiss it, wait another year!",
    "countdown": "June 4 00:00 - June 12 00:00 (UTC+0)\nCountdown: 05D 12H 00M",
    "membership": "Pro from $39/mo\nUltimate from $99/mo",
    "model_rates": "Seedance 2.0 from $0.018/sec\nNano Banana 2 from $0.018/img\nGPT Image 2 from $0.003/img",
    "price_card": "57% OFF\nLowest confirmed price window of 2026",
    "cta": "Pay less. Create more with Lovart.",
    "final_cta": "Unlock full AI creative power at a lower price.",
    "image_top": "Year's Best Deal: 57% Off · Miss It, Wait a Year",
}


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _duration(asset: MediaAsset, fallback: float = 6.0) -> float:
    try:
        return max(0.1, float(asset.duration_sec or fallback))
    except (TypeError, ValueError):
        return fallback


def _is_price_card(asset: MediaAsset) -> bool:
    name = asset.path.lower()
    return asset.type == "image" and any(token in name for token in ("price", "pricing", "card", "plan", "lovart"))


def _is_talking_head(asset: MediaAsset) -> bool:
    name = asset.path.lower()
    return asset.type == "video" and any(token in name for token in ("talk", "avatar", "person", "口播", "数字人", "真人", "reaction"))


def _style(anchor: str, *, width: float, height: float) -> VideoStyle:
    anchors = {
        "top": (0.5, 0.105),
        "top_right": (0.72, 0.22),
        "bottom_left": (0.36, 0.70),
        "bottom_right": (0.68, 0.78),
        "bottom": (0.5, 0.84),
        "right": (0.76, 0.62),
        "center": (0.5, 0.5),
    }
    x, y = anchors.get(anchor, anchors["center"])
    return VideoStyle(position_x=x, position_y=y, width=width, height=height, opacity=1.0)


def _params(
    component_type: str | None,
    *,
    color: str = "#0F0F23",
    accent: str = "#8B5CF6",
    preset: str = "cinema_dark",
    anchor: str = "center",
    motion: str = "pop",
    intensity: float = 0.9,
    safe_area: float = 0.05,
) -> EffectParams:
    return EffectParams(
        intensity=intensity,
        color=color,
        accent_color=accent,
        component_type=component_type,
        preset_id=preset,
        layout_anchor=anchor,
        motion_preset=motion,
        safe_area=safe_area,
    )


def _effect(
    start: float,
    end: float,
    kind: str,
    scope: str,
    *,
    text: str | None = None,
    style: VideoStyle | None = None,
    params: EffectParams | None = None,
) -> Clip:
    return Clip(
        id=_id("clip"),
        type="effect",
        timeline_start_sec=round(start, 3),
        timeline_end_sec=round(max(end, start + 0.1), 3),
        effect_kind=kind,
        effect_scope=scope,
        subtitle_text=text,
        video_style=style,
        effect_params=params,
    )


def _segment(duration: float, start_pct: float, end_pct: float, *, min_len: float = 0.8, max_len: float | None = None) -> tuple[float, float]:
    start = max(0.0, duration * start_pct)
    end = max(start + min_len, duration * end_pct)
    if max_len is not None:
        end = min(end, start + max_len)
    return round(start, 3), round(min(duration, end), 3)


def _merge_copy(copy_pack: dict[str, Any] | None) -> dict[str, str]:
    merged = dict(DEFAULT_COPY)
    if isinstance(copy_pack, dict):
        for key, value in copy_pack.items():
            if key in merged and isinstance(value, str) and value.strip():
                merged[key] = value.strip()
    return merged


def draft_promo_remix_timeline(
    timeline: TimelineProject,
    brief: str,
    *,
    copy_pack: dict[str, Any] | None = None,
    max_primary_duration_sec: float | None = None,
    append_price_card: bool = True,
) -> dict[str, Any]:
    """Replace timeline tracks with an adaptive promotional remix draft."""

    copy = _merge_copy(copy_pack)
    videos = [m for m in timeline.media_pool if m.type == "video"]
    images = [m for m in timeline.media_pool if m.type == "image"]
    if not videos and not images:
        return {"error": "media_pool has no video or image assets to draft from"}

    talking_head = next((m for m in videos if _is_talking_head(m)), None)
    primary_video = talking_head or (videos[0] if videos else None)
    price_card = next((m for m in images if _is_price_card(m)), None) or (images[0] if images else None)

    fps = timeline.project.fps or 30
    width = primary_video.width or price_card.width or timeline.project.width
    height = primary_video.height or price_card.height or timeline.project.height
    timeline.project.width = int(width or 1920)
    timeline.project.height = int(height or 1080)
    timeline.project.fps = fps

    tracks = [
        Track(id="track-video", name="Base Video + Price Card", type="video", clips=[]),
        Track(id="track-stage", name="Full-page Ad Scenes", type="effect", clips=[]),
        Track(id="track-fx-fullscreen", name="Full-screen FX", type="effect", clips=[]),
        Track(id="track-topbar", name="Promo Top Bar", type="effect", clips=[]),
        Track(id="track-price", name="Price / Reaction Components", type="effect", clips=[]),
        Track(id="track-countdown", name="Countdown / Model Rates", type="effect", clips=[]),
        Track(id="track-cta", name="CTA / SKU Highlight", type="effect", clips=[]),
    ]

    cursor = 0.0
    primary_duration = 0.0
    if primary_video:
        raw_duration = _duration(primary_video, fallback=12.0)
        primary_duration = min(raw_duration, max_primary_duration_sec) if max_primary_duration_sec else raw_duration
        tracks[0].clips.append(
            Clip(
                id=_id("clip"),
                type="video",
                media_id=primary_video.id,
                source_in_sec=0,
                source_out_sec=primary_duration,
                timeline_start_sec=0,
                timeline_end_sec=primary_duration,
                speed=1,
            )
        )
        cursor = primary_duration

    image_duration = 0.0
    if append_price_card and price_card:
        image_duration = min(_duration(price_card, fallback=6.0), 8.0)
        tracks[0].clips.append(
            Clip(
                id=_id("clip"),
                type="video",
                media_id=price_card.id,
                source_in_sec=0,
                source_out_sec=image_duration,
                timeline_start_sec=cursor,
                timeline_end_sec=cursor + image_duration,
                speed=1,
                video_style=VideoStyle(position_x=0.5, position_y=0.5, width=1, height=1, fit="contain", opacity=1),
            )
        )

    story_duration = max(primary_duration, image_duration, 6.0)
    base_story_end = primary_duration if primary_video else image_duration

    if primary_video:
        stage_end = min(2.6, base_story_end)
        tracks[1].clips.append(
            _effect(
                0,
                stage_end,
                "callout",
                "fullscreen",
                text=(
                    "Lowest Price of the Year\n"
                    "57% Off\n"
                    "June 4 00:00 - June 12 00:00 (UTC+0)\n"
                    "Pro from $39/mo\n"
                    "Ultimate from $99/mo\n"
                    "Pay less. Create more with Lovart."
                ),
                params=_params("offer_stage", color="#0F0F23", accent="#E11D48", preset="cinema_dark", anchor="center", motion="slide", intensity=1.0),
            )
        )
        speed_start = min(stage_end, max(0.0, base_story_end - 0.9))
        tracks[2].clips.append(
            _effect(
                speed_start,
                min(speed_start + 0.9, base_story_end),
                "speed_lines",
                "fullscreen",
                params=EffectParams(intensity=0.68, color="#0b0b0a", accent_color="#8b5cf6", direction="right", motion_preset="pulse", z_index_policy="top"),
            )
        )
        if price_card and image_duration > 0 and base_story_end > 0.8:
            tracks[2].clips.append(
                _effect(
                    base_story_end - 0.55,
                    base_story_end,
                    "flash",
                    "fullscreen",
                    params=EffectParams(intensity=0.42, color="#ffffff", accent_color="#ffffff", motion_preset="pulse"),
                )
            )

        s, e = _segment(story_duration, 0.005, 0.22, max_len=7.4)
        s = max(s, min(2.4, base_story_end))
        tracks[3].clips.append(
            _effect(
                s,
                min(e, base_story_end),
                "callout",
                "component",
                text=copy["hook"],
                style=_style("top", width=0.86, height=0.11),
                params=_params("promo_top_bar", color="#0F0F23", accent="#8B5CF6", preset="lovart_promo", anchor="top", motion="slide", intensity=0.96, safe_area=0.04),
            )
        )

        s, e = _segment(story_duration, 0.02, 0.14, max_len=4.8)
        s = max(s, min(2.8, base_story_end))
        tracks[4].clips.append(
            _effect(
                s,
                min(e, base_story_end),
                "sticker_text",
                "component",
                text=copy["reaction"],
                style=_style("bottom_left", width=0.44, height=0.20),
                params=_params("reaction_sticker", color="#0F0F23", accent="#E11D48", preset="cinema_dark", anchor="bottom_left", motion="pop", intensity=0.94),
            )
        )

        s, e = _segment(story_duration, 0.14, 0.40, max_len=8.5)
        tracks[5].clips.append(
            _effect(
                s,
                min(e, base_story_end),
                "callout",
                "component",
                text=copy["countdown"],
                style=_style("top_right", width=0.34, height=0.16),
                params=_params("countdown_banner", color="#111827", accent="#8B5CF6", preset="lovart_promo", anchor="top_right", motion="pop"),
            )
        )

        s, e = _segment(story_duration, 0.40, 0.68, max_len=9.0)
        tracks[4].clips.append(
            _effect(
                s,
                min(e, base_story_end),
                "sticker_text",
                "component",
                text=copy["membership"],
                style=_style("bottom_left", width=0.40, height=0.16),
                params=_params("price_badge", color="#0F0F23", accent="#8B5CF6", preset="lovart_promo", anchor="bottom_left", motion="pop"),
            )
        )

        s, e = _segment(story_duration, 0.72, 1.0, max_len=8.0)
        tracks[6].clips.append(
            _effect(
                min(s, max(0, base_story_end - 8)),
                base_story_end,
                "callout",
                "component",
                text=copy["cta"],
                style=_style("bottom_right", width=0.38, height=0.12),
                params=_params("cta_badge", color="#0F0F23", accent="#E11D48", preset="cinema_dark", anchor="bottom_right", motion="slide"),
            )
        )

    if price_card and image_duration > 0:
        image_start = cursor
        image_end = cursor + image_duration
        tracks[1].clips.append(
            _effect(
                image_start,
                image_end,
                "callout",
                "fullscreen",
                text=(
                    f"{copy['image_top']}\n"
                    f"{copy['price_card']}\n"
                    f"{copy['membership']}\n"
                    f"{copy['model_rates']}\n"
                    f"{copy['final_cta']}"
                ),
                params=_params("pricing_stage", color="#0F0F23", accent="#8B5CF6", preset="cinema_dark", anchor="center", motion="slide", intensity=1.0),
            )
        )

    timeline.tracks = tracks
    plan = build_creative_plan(timeline, brief)
    errors = validate_timeline(timeline)
    if errors:
        return {"error": "Draft produced invalid timeline", "validation_errors": errors}

    return {
        "success": True,
        "timeline": timeline.model_dump(),
        "creative_plan": plan,
        "visual_qa": build_visual_qa_report(timeline),
        "draft_summary": {
            "primary_video_id": primary_video.id if primary_video else None,
            "price_card_id": price_card.id if price_card else None,
            "talking_head_detected": bool(talking_head),
            "missing_inputs": [] if talking_head else ["talking_head_or_avatar_video"],
            "timeline_end_sec": max((clip.timeline_end_sec for track in tracks for clip in track.clips), default=0),
            "method": "adaptive normalized recipe converted to current media duration",
        },
    }
