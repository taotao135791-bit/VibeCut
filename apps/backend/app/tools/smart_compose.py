"""Smart compose — semantic anchor-driven timeline composition.

Replaces percentage-based mechanical segmentation with anchor-point-driven
placement. The agent analyzes the video (reads transcript, identifies key
moments), provides anchors, and this tool places MG components at precisely
those semantic moments.

Supports two modes:
- overlay: Original video plays uncut, MG overlays at anchor points
- remix: Video is restructured — full-card hooks, PiP segments, new ordering
"""

from __future__ import annotations

import json
import random
import uuid
from typing import Any

from app.models.timeline import Clip, EffectParams, Track, VideoStyle, TimelineProject
from app.services.timeline_validator import validate_timeline
from app.tools.registry import registry


def _id() -> str:
    return f"clip_{uuid.uuid4().hex[:8]}"


def _jitter(base: float, amount: float = 0.3) -> float:
    """Add random jitter to a time value."""
    return max(0, base + random.uniform(-amount, amount))


def _pick_motion() -> str:
    return random.choice(["spring", "pop", "slide", "spring", "spring"])


@registry.register(
    name="smart_compose",
    description=(
        "Place agent-created MG components onto the timeline at specified anchor points. "
        "The agent writes custom TSX components and registers them via register_creative_pack first, "
        "then calls this tool to place them at exact timestamps. "
        "\n\nThis tool only PLACES components. It does NOT design them. The agent designs them. "
        "\n\nEach anchor specifies: time, component name (from registered pack), and duration. "
        "Components on the same track must not overlap in time."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {
            "video_analysis": {
                "type": "STRING",
                "description": (
                    'JSON: {"duration_sec": N, '
                    '"anchors": [{"time": 0, "component": "HookCard", "duration": 3}, '
                    '{"time": 6, "component": "PriceBar", "end_time": 14}, '
                    '{"time": 24, "component": "ClosingCard", "duration": 5.58}]}. '
                    'Each anchor places ONE registered component at that time.'
                ),
            },
            "brand": {
                "type": "STRING",
                "description": 'JSON: {"primary": "#hex", "accent": "#hex", "bg": "#000", "text": "#fff"}',
            },
            "copy": {
                "type": "STRING",
                "description": 'JSON: {"hook": "text", "cta": "text", "watermark": "Brand"} — text content for components',
            },
        },
        "required": ["video_analysis", "brand"],
    },
)
async def smart_compose(args: dict, state) -> dict:
    if not state.current_timeline:
        return {"error": "No timeline exists. Create/register media first."}

    # Parse inputs
    try:
        analysis = json.loads(args["video_analysis"]) if isinstance(args["video_analysis"], str) else args["video_analysis"]
        brand = json.loads(args["brand"]) if isinstance(args["brand"], str) else args["brand"]
        copy = json.loads(args.get("copy", "{}")) if isinstance(args.get("copy", "{}"), str) else args.get("copy", {})
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {e}"}

    timeline = state.current_timeline
    duration = analysis.get("duration_sec", 30)
    anchors = analysis.get("anchors", [])

    if not anchors:
        return {"error": "No anchors provided. Provide at least one anchor with time + component."}

    primary = brand.get("primary", "#6366f1")
    accent = brand.get("accent", "#f59e0b")
    bg_color = brand.get("bg", "#000000")
    text_color = brand.get("text", "#ffffff")

    base_params = {
        "color": primary,
        "accent_color": accent,
        "bg_color": bg_color,
        "text_color": text_color,
    }

    # Sort anchors by time
    anchors = sorted(anchors, key=lambda a: a.get("time", 0))

    # Create effect tracks (one per anchor to avoid overlaps)
    effect_tracks = []
    placed = []

    for i, anchor in enumerate(anchors):
        t = anchor.get("time", 0)
        component = anchor.get("component", "")
        anchor_duration = anchor.get("duration")
        end_time = anchor.get("end_time")
        text_content = anchor.get("text") or copy.get("hook", "")
        preset = anchor.get("preset", "")
        pack = anchor.get("pack", "")

        if not component:
            return {"error": f"Anchor at {t}s has no 'component' specified."}

        # Determine end time
        if end_time:
            comp_end = min(float(end_time), duration)
        elif anchor_duration:
            comp_end = min(t + float(anchor_duration), duration)
        else:
            comp_end = min(t + 3.0, duration)  # default 3s

        # Determine scope: fullscreen if no video_style needed
        # Components with "Card" or "Splash" in name are fullscreen
        is_fullscreen = any(kw in component for kw in ("Card", "Splash", "Full", "Closing"))
        scope = "fullscreen" if is_fullscreen else "component"

        # Create a dedicated track for this anchor
        track_id = f"track-fx-{i}"
        track = Track(id=track_id, name=f"MG {i+1}: {component}", type="effect", clips=[])

        # Build effect params
        effect_params_dict = {
            **base_params,
            "component_type": component,
            "intensity": 1.0,
            "motion_preset": "spring",
        }
        if pack:
            effect_params_dict["pack"] = pack
        if preset:
            effect_params_dict["preset_id"] = preset

        # Video style for non-fullscreen components
        vs = None
        if not is_fullscreen:
            # Default bottom bar positioning
            if "Bar" in component or "Strip" in component:
                vs = VideoStyle(position_x=0.5, position_y=0.94, width=1.0, height=0.09)
            else:
                vs = VideoStyle(position_x=0.5, position_y=0.5, width=0.5, height=0.2)

        clip_kwargs: dict = {
            "id": _id(),
            "type": "effect",
            "timeline_start_sec": round(t, 2),
            "timeline_end_sec": round(comp_end, 2),
            "effect_kind": "callout",
            "effect_scope": scope,
            "subtitle_text": text_content,
            "effect_params": EffectParams(**effect_params_dict),
        }
        if vs:
            clip_kwargs["video_style"] = vs

        track.clips.append(Clip(**clip_kwargs))
        effect_tracks.append(track)
        placed.append({"time": t, "component": component, "end": comp_end, "track": track_id})

    # Watermark track (if provided)
    if copy.get("watermark"):
        wm_track = Track(id="track-fx-wm", name="Watermark", type="effect", clips=[])
        wm_start = anchors[0].get("time", 0) + 3 if anchors else 3.0
        wm_track.clips.append(Clip(
            id=_id(), type="effect",
            timeline_start_sec=round(wm_start, 2),
            timeline_end_sec=round(duration, 2),
            effect_kind="callout", effect_scope="component",
            subtitle_text=copy["watermark"],
            effect_params=EffectParams(**base_params, component_type="Watermark", intensity=0.4, layout_anchor="bottom_right"),
        ))
        effect_tracks.append(wm_track)

    # Apply to timeline: keep video/audio tracks, replace effect tracks
    video_tracks = [t for t in timeline.tracks if t.type in ("video", "audio")]
    timeline.tracks = video_tracks + effect_tracks

    errors = validate_timeline(timeline)
    if errors:
        return {"error": "Compose produced invalid timeline", "validation_errors": errors}

    return {
        "success": True,
        "components_placed": len(placed),
        "placement_summary": placed,
        "timeline_end_sec": max((c.timeline_end_sec for t in timeline.tracks for c in t.clips), default=0),
    }
