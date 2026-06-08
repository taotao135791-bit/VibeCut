"""Deterministic visual QA helpers for timeline edits."""

from __future__ import annotations

from typing import Any


def _duration(clip: Any) -> float:
    return max(0.0, float(clip.timeline_end_sec) - float(clip.timeline_start_sec))


def _clip_label(clip: Any) -> str:
    return (
        getattr(clip, "subtitle_text", None)
        or getattr(clip, "effect_kind", None)
        or getattr(clip, "media_id", None)
        or getattr(clip, "id", "clip")
    )


def _params_dict(clip: Any) -> dict[str, Any]:
    params = getattr(clip, "effect_params", None)
    if params is None:
        return {}
    if hasattr(params, "model_dump"):
        return {k: v for k, v in params.model_dump().items() if v is not None}
    if isinstance(params, dict):
        return params
    return {}


def _style_dict(clip: Any) -> dict[str, Any]:
    style = getattr(clip, "video_style", None)
    if style is None:
        return {}
    if hasattr(style, "model_dump"):
        return {k: v for k, v in style.model_dump().items() if v is not None}
    if isinstance(style, dict):
        return style
    return {}


def _sample_times(timeline: Any, max_samples: int = 14) -> list[dict[str, Any]]:
    candidates: list[tuple[float, str]] = []
    for track in timeline.tracks:
        for clip in track.clips:
            dur = _duration(clip)
            if dur <= 0:
                continue
            candidates.append((float(clip.timeline_start_sec), f"{track.name}: {_clip_label(clip)} start"))
            candidates.append((float(clip.timeline_start_sec) + dur / 2, f"{track.name}: {_clip_label(clip)} midpoint"))
            if dur > 1.0:
                candidates.append((float(clip.timeline_end_sec) - min(0.2, dur / 5), f"{track.name}: {_clip_label(clip)} exit"))

    seen: set[float] = set()
    samples: list[dict[str, Any]] = []
    for time_sec, reason in sorted(candidates, key=lambda item: item[0]):
        rounded = round(time_sec, 2)
        if rounded in seen:
            continue
        seen.add(rounded)
        samples.append({"time_sec": rounded, "reason": reason})
        if len(samples) >= max_samples:
            break
    return samples


def build_visual_qa_report(timeline: Any) -> dict[str, Any]:
    """Return frame-level checks any multimodal coding agent can use."""

    warnings: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    effect_count = 0
    semantic_component_count = 0
    first_semantic_start: float | None = None

    for track in timeline.tracks:
        for clip in track.clips:
            if clip.type != "effect":
                continue
            effect_count += 1
            params = _params_dict(clip)
            style = _style_dict(clip)
            component_type = params.get("component_type")
            text = getattr(clip, "subtitle_text", "") or params.get("label", "")
            is_full_page_stage = component_type in {"offer_stage", "pricing_stage", "proof_stage"}
            if is_full_page_stage:
                semantic_component_count += 1
                first_semantic_start = (
                    float(clip.timeline_start_sec)
                    if first_semantic_start is None
                    else min(first_semantic_start, float(clip.timeline_start_sec))
                )

            if clip.effect_scope == "component":
                if component_type:
                    semantic_component_count += 1
                    first_semantic_start = (
                        float(clip.timeline_start_sec)
                        if first_semantic_start is None
                        else min(first_semantic_start, float(clip.timeline_start_sec))
                    )
                else:
                    warnings.append(
                        {
                            "clip_id": clip.id,
                            "severity": "warning",
                            "message": "Component effect lacks component_type; it may render as a generic sticker.",
                        }
                    )

                x = float(style.get("position_x", 0.5))
                y = float(style.get("position_y", 0.5))
                width = float(style.get("width", 0.3))
                height = float(style.get("height", 0.16))
                safe_area = float(params.get("safe_area", 0.04))

                if width <= 0.02 or height <= 0.02:
                    errors.append(
                        {
                            "clip_id": clip.id,
                            "severity": "error",
                            "message": "Component box is too small to be legible.",
                        }
                    )

                left = x - width / 2
                right = x + width / 2
                top = y - height / 2
                bottom = y + height / 2
                if left < safe_area or right > 1 - safe_area or top < safe_area or bottom > 1 - safe_area:
                    warnings.append(
                        {
                            "clip_id": clip.id,
                            "severity": "warning",
                            "message": "Component may sit outside the safe area or too close to the edge.",
                            "box": {"left": round(left, 3), "top": round(top, 3), "right": round(right, 3), "bottom": round(bottom, 3)},
                        }
                    )

                if text and len(text) > 120 and width < 0.5:
                    warnings.append(
                        {
                            "clip_id": clip.id,
                            "severity": "warning",
                            "message": "Long promo copy in a narrow component may wrap poorly.",
                        }
                    )

            if clip.effect_scope == "fullscreen" and _duration(clip) > 2.0 and not is_full_page_stage:
                warnings.append(
                    {
                        "clip_id": clip.id,
                        "severity": "warning",
                        "message": "Full-screen effect lasts more than 2 seconds; verify it does not hide the source footage.",
                    }
                )

    if effect_count > 0 and first_semantic_start is not None and first_semantic_start > 2.0:
        warnings.append(
            {
                "severity": "warning",
                "message": "First semantic promo component appears after 2 seconds; ad remixes usually need an immediate hook.",
            }
        )
    if effect_count > 0 and semantic_component_count / max(effect_count, 1) < 0.45:
        warnings.append(
            {
                "severity": "warning",
                "message": "Most effects are generic rather than semantic promo components; reusable ad quality may suffer.",
            }
        )

    score = 100 - len(errors) * 20 - len(warnings) * 7
    score = max(0, min(100, score))
    return {
        "success": True,
        "summary": {
            "score": score,
            "effects": effect_count,
            "semantic_components": semantic_component_count,
            "errors": len(errors),
            "warnings": len(warnings),
        },
        "sample_times": _sample_times(timeline),
        "errors": errors,
        "warnings": warnings,
        "next_steps": [
            "Render stills at sample_times and inspect money-shot coverage.",
            "Use a multimodal model on those stills for layout, contrast, and copy legibility.",
            "Adjust component position/size or component_type before final export.",
        ],
    }
