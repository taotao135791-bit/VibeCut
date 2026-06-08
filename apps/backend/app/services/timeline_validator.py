"""Timeline invariant validation.

Pydantic validates field shape, but it cannot validate project-level editing
rules such as unique IDs, clip/media references, source ranges, and same-track
overlaps. This module is intentionally provider-neutral so external agents can
use the backend as a safe timeline runtime.
"""

from __future__ import annotations

from app.models.timeline import TimelineProject


VALID_TRACK_TYPES = {"video", "audio", "subtitle", "effect"}
VALID_MEDIA_TYPES = {"video", "audio", "image"}
VALID_EFFECT_KINDS = {
    "flash",
    "cinematic_bars",
    "speed_lines",
    "spotlight",
    "callout",
    "sticker_text",
}
# Custom effect_kinds from creative packs are allowed — only structural validation
# (non-empty string) is enforced. The frontend pack registry handles rendering.
ALLOW_CUSTOM_EFFECT_KINDS = True

VALID_EFFECT_SCOPES = {"fullscreen", "component"}
# component_type is now open — creative packs can register any component name.
# We keep the known set for reference but no longer reject unknown types.
KNOWN_COMPONENT_TYPES = {
    "promo_top_bar",
    "price_badge",
    "countdown_banner",
    "model_rate_grid",
    "reaction_sticker",
    "cta_badge",
    "offer_stage",
    "pricing_stage",
    "proof_stage",
}
ALLOW_CUSTOM_COMPONENT_TYPES = True
VALID_MOTION_PRESETS = {"pop", "slide", "slide-up", "pulse", "spring", "none"}
VALID_LAYOUT_ANCHORS = {
    "top",
    "bottom",
    "left",
    "right",
    "center",
    "top_left",
    "top_right",
    "bottom_left",
    "bottom_right",
}
EPSILON = 1e-6


def validate_timeline(timeline: TimelineProject) -> list[str]:
    errors: list[str] = []

    if timeline.project.width <= 0:
        errors.append("project.width must be positive")
    if timeline.project.height <= 0:
        errors.append("project.height must be positive")
    if timeline.project.fps <= 0:
        errors.append("project.fps must be positive")

    media_by_id = {}
    for media in timeline.media_pool:
        if media.id in media_by_id:
            errors.append(f"duplicate media id: {media.id}")
        media_by_id[media.id] = media
        if media.type not in VALID_MEDIA_TYPES:
            errors.append(f"media {media.id}: invalid type {media.type!r}")
        if media.duration_sec is not None and media.duration_sec < 0:
            errors.append(f"media {media.id}: duration_sec must be non-negative")
        if media.width is not None and media.width <= 0:
            errors.append(f"media {media.id}: width must be positive")
        if media.height is not None and media.height <= 0:
            errors.append(f"media {media.id}: height must be positive")

    track_ids: set[str] = set()
    clip_ids: set[str] = set()

    for track in timeline.tracks:
        if track.id in track_ids:
            errors.append(f"duplicate track id: {track.id}")
        track_ids.add(track.id)

        if track.type not in VALID_TRACK_TYPES:
            errors.append(f"track {track.id}: invalid type {track.type!r}")

        sorted_clips = sorted(track.clips, key=lambda c: c.timeline_start_sec)
        prev_end: float | None = None
        prev_id: str | None = None

        for clip in sorted_clips:
            label = f"clip {clip.id}"
            if clip.id in clip_ids:
                errors.append(f"duplicate clip id: {clip.id}")
            clip_ids.add(clip.id)

            if clip.type not in VALID_TRACK_TYPES:
                errors.append(f"{label}: invalid type {clip.type!r}")
            if clip.type != track.type:
                errors.append(
                    f"{label}: type {clip.type!r} does not match track {track.id} type {track.type!r}"
                )

            if clip.timeline_start_sec < 0:
                errors.append(f"{label}: timeline_start_sec must be non-negative")
            if clip.timeline_end_sec <= clip.timeline_start_sec + EPSILON:
                errors.append(f"{label}: timeline_end_sec must be greater than timeline_start_sec")

            speed = clip.speed or 0
            if speed <= 0:
                errors.append(f"{label}: speed must be positive")
            if clip.volume < 0:
                errors.append(f"{label}: volume must be non-negative")
            if clip.fade_in_sec < 0:
                errors.append(f"{label}: fade_in_sec must be non-negative")
            if clip.fade_out_sec < 0:
                errors.append(f"{label}: fade_out_sec must be non-negative")

            if prev_end is not None and clip.timeline_start_sec < prev_end - EPSILON:
                errors.append(
                    f"track {track.id}: {label} overlaps previous clip {prev_id}"
                )
            prev_end = max(prev_end or 0, clip.timeline_end_sec)
            prev_id = clip.id

            if clip.type in {"video", "audio"}:
                if not clip.media_id:
                    errors.append(f"{label}: media_id is required for {clip.type} clips")
                    continue
                asset = media_by_id.get(clip.media_id)
                if not asset:
                    errors.append(f"{label}: media_id {clip.media_id!r} not found in media_pool")
                    continue
                if clip.type == "video" and asset.type not in {"video", "image"}:
                    errors.append(f"{label}: video clip cannot reference {asset.type} media")
                if clip.type == "audio" and asset.type not in {"audio", "video"}:
                    errors.append(f"{label}: audio clip cannot reference {asset.type} media")

                if clip.source_in_sec < 0:
                    errors.append(f"{label}: source_in_sec must be non-negative")
                if clip.source_out_sec is not None:
                    if clip.source_out_sec <= clip.source_in_sec + EPSILON:
                        errors.append(f"{label}: source_out_sec must be greater than source_in_sec")
                    if asset.duration_sec is not None and clip.source_out_sec > asset.duration_sec + EPSILON:
                        errors.append(
                            f"{label}: source_out_sec exceeds media duration "
                            f"({clip.source_out_sec:.3f}s > {asset.duration_sec:.3f}s)"
                        )

            if clip.type == "subtitle":
                if clip.media_id and clip.media_id not in media_by_id:
                    errors.append(f"{label}: subtitle media_id {clip.media_id!r} not found in media_pool")
                if not clip.media_id and not (clip.subtitle_text or "").strip():
                    errors.append(f"{label}: subtitle_text is required when no subtitle media_id is set")

            if clip.type == "effect":
                if not clip.effect_kind:
                    errors.append(f"{label}: effect_kind is required for effect clips")
                elif not ALLOW_CUSTOM_EFFECT_KINDS and clip.effect_kind not in VALID_EFFECT_KINDS:
                    errors.append(f"{label}: invalid effect_kind {clip.effect_kind!r}")
                if not clip.effect_scope:
                    errors.append(f"{label}: effect_scope is required for effect clips")
                elif clip.effect_scope not in VALID_EFFECT_SCOPES:
                    errors.append(f"{label}: invalid effect_scope {clip.effect_scope!r}")
                params = clip.effect_params
                if params:
                    if params.component_type and not ALLOW_CUSTOM_COMPONENT_TYPES and params.component_type not in KNOWN_COMPONENT_TYPES:
                        errors.append(f"{label}: invalid component_type {params.component_type!r}")
                    if params.motion_preset and params.motion_preset not in VALID_MOTION_PRESETS:
                        errors.append(f"{label}: invalid motion_preset {params.motion_preset!r}")
                    if params.layout_anchor and params.layout_anchor not in VALID_LAYOUT_ANCHORS:
                        errors.append(f"{label}: invalid layout_anchor {params.layout_anchor!r}")
                    if params.safe_area is not None and (params.safe_area < 0 or params.safe_area > 0.5):
                        errors.append(f"{label}: safe_area must be between 0 and 0.5")

    return errors


def assert_valid_timeline(timeline: TimelineProject) -> None:
    errors = validate_timeline(timeline)
    if errors:
        raise ValueError("; ".join(errors))
