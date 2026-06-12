"""Ripple editing operations: delete time ranges (with auto gap-closing) and
insert gaps. These are the workhorse tools for transcript-based editing —
"delete these spoken words/silences" maps directly to delete_time_ranges.
"""

from __future__ import annotations

import uuid
from copy import deepcopy

from app.models.timeline import Clip, TimelineProject, Track
from app.tools.registry import registry
from app.tools.timeline_ops import _parse_json_arg

EPS = 1e-6


def _gen_id(prefix: str = "clip") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _clamp_fades(clip: Clip) -> None:
    dur = clip.timeline_end_sec - clip.timeline_start_sec
    if clip.fade_in_sec and clip.fade_in_sec > dur:
        clip.fade_in_sec = round(dur, 6)
    if clip.fade_out_sec and clip.fade_out_sec > dur:
        clip.fade_out_sec = round(dur, 6)


def _merge_ranges(ranges: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Sort and merge overlapping/adjacent ranges."""
    ordered = sorted(ranges, key=lambda r: r[0])
    merged: list[list[float]] = []
    for start, end in ordered:
        if merged and start <= merged[-1][1] + EPS:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [(s, e) for s, e in merged]


def _cut_range_on_track(track: Track, start: float, end: float, ripple: bool) -> dict:
    """Delete timeline range [start, end) on one track.

    Clips fully inside are removed; clips crossing a boundary are trimmed
    (source range adjusted by speed); clips spanning the whole range are split
    into two. With ripple=True everything after the range shifts left.
    """
    dur = end - start
    removed: list[str] = []
    trimmed: list[str] = []
    shifted = 0
    new_clips: list[Clip] = []

    for clip in list(track.clips):
        cs, ce = clip.timeline_start_sec, clip.timeline_end_sec
        speed = clip.speed or 1.0
        has_source = clip.media_id is not None

        if ce <= start + EPS:
            # Entirely before the range
            new_clips.append(clip)
        elif cs >= end - EPS:
            # Entirely after the range
            if ripple:
                clip.timeline_start_sec = round(cs - dur, 6)
                clip.timeline_end_sec = round(ce - dur, 6)
                shifted += 1
            new_clips.append(clip)
        elif cs >= start - EPS and ce <= end + EPS:
            # Fully inside the range
            removed.append(clip.id)
        elif cs < start and ce > end:
            # Spans the whole range — split into head + tail
            head = clip
            tail = deepcopy(clip)
            tail.id = _gen_id("clip")

            if has_source:
                src_in = head.source_in_sec or 0
                head.source_out_sec = round(src_in + (start - cs) * speed, 6)
                tail.source_in_sec = round(src_in + (end - cs) * speed, 6)
            head.timeline_end_sec = round(start, 6)

            tail_dur = ce - end
            tail_start = start if ripple else end
            tail.timeline_start_sec = round(tail_start, 6)
            tail.timeline_end_sec = round(tail_start + tail_dur, 6)

            _clamp_fades(head)
            _clamp_fades(tail)
            new_clips.append(head)
            new_clips.append(tail)
            trimmed.append(clip.id)
            if ripple:
                shifted += 1
        elif cs < start:
            # Crosses range start — keep the head, trim the tail
            if has_source:
                clip.source_out_sec = round((clip.source_in_sec or 0) + (start - cs) * speed, 6)
            clip.timeline_end_sec = round(start, 6)
            _clamp_fades(clip)
            new_clips.append(clip)
            trimmed.append(clip.id)
        else:
            # Crosses range end — keep the tail, trim the head
            if has_source:
                clip.source_in_sec = round((clip.source_in_sec or 0) + (end - cs) * speed, 6)
            tail_dur = ce - end
            new_start = start if ripple else end
            clip.timeline_start_sec = round(new_start, 6)
            clip.timeline_end_sec = round(new_start + tail_dur, 6)
            _clamp_fades(clip)
            new_clips.append(clip)
            trimmed.append(clip.id)
            if ripple:
                shifted += 1

    track.clips = sorted(new_clips, key=lambda c: c.timeline_start_sec)
    return {"removed": removed, "trimmed": trimmed, "shifted": shifted}


def _timeline_duration(timeline: TimelineProject) -> float:
    return max(
        (c.timeline_end_sec for t in timeline.tracks for c in t.clips),
        default=0.0,
    )


def delete_ranges_core(
    timeline: TimelineProject,
    ranges: list[tuple[float, float]],
    track_ids: list[str] | None = None,
    ripple: bool = True,
) -> dict:
    """Pure core of delete_time_ranges (also used by tests)."""
    merged = _merge_ranges(ranges)

    if track_ids:
        known = {t.id for t in timeline.tracks}
        missing = [tid for tid in track_ids if tid not in known]
        if missing:
            return {"error": f"Track(s) not found: {', '.join(missing)}"}

    targets = [
        t
        for t in timeline.tracks
        if not t.locked and (not track_ids or t.id in track_ids)
    ]
    if not targets:
        return {"error": "No unlocked target tracks to edit"}

    per_track: dict[str, dict] = {t.id: {"removed": [], "trimmed": [], "shifted": 0} for t in targets}

    # Process ranges back-to-front so earlier range coordinates stay valid.
    for start, end in reversed(merged):
        for track in targets:
            r = _cut_range_on_track(track, start, end, ripple)
            per_track[track.id]["removed"].extend(r["removed"])
            per_track[track.id]["trimmed"].extend(r["trimmed"])
            per_track[track.id]["shifted"] += r["shifted"]

    total_removed = sum(e - s for s, e in merged)
    return {
        "success": True,
        "ripple": ripple,
        "ranges_deleted": [
            {"start_sec": round(s, 6), "end_sec": round(e, 6)} for s, e in merged
        ],
        "total_removed_sec": round(total_removed if ripple else 0.0, 6) if ripple else 0.0,
        "per_track": per_track,
        "timeline_duration_sec": round(_timeline_duration(timeline), 6),
    }


@registry.register(
    name="delete_time_ranges",
    description=(
        "Delete one or more TIMELINE time ranges and (by default) ripple: shift everything "
        "after each range left so no gaps remain. Clips fully inside a range are removed; "
        "clips crossing a boundary are trimmed; clips spanning a range are split in two. "
        "Affects all unlocked tracks unless track_ids is given, keeping video/audio/subtitles in sync. "
        "Ranges may be unsorted and overlapping — they are merged automatically. "
        "\n\nThis is THE tool for transcript-based editing: transcribe_audio → pick the words/"
        "silences to remove → map_time (source_to_timeline) → delete_time_ranges. "
        "One call handles many ranges; never compute shifted offsets yourself. "
        "\n\nWhen to use: removing filler words, silences, bad takes, or any unwanted segments by time range. "
        "When NOT to use: removing whole clips by id (delete_clips), closing an already-empty gap (remove_gap)."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {
            "ranges": {
                "type": "STRING",
                "description": (
                    "JSON array of timeline ranges to delete: "
                    "[{\"start_sec\": 12.3, \"end_sec\": 13.1}, ...]. Seconds, timeline time."
                ),
            },
            "track_ids": {
                "type": "STRING",
                "description": "Optional JSON array of track IDs to restrict the edit. Default: all unlocked tracks.",
            },
            "ripple": {
                "type": "BOOLEAN",
                "description": "Shift subsequent clips left to close the gaps (default true). false = leave gaps.",
            },
        },
        "required": ["ranges"],
    },
)
async def delete_time_ranges(args: dict, state) -> dict:
    if not state.current_timeline:
        return {"error": "No timeline exists. Use create_timeline first."}

    raw, err = _parse_json_arg(args.get("ranges", "[]"), "ranges")
    if err:
        return err
    if not isinstance(raw, list) or not raw:
        return {"error": "ranges must be a non-empty JSON array"}

    ranges: list[tuple[float, float]] = []
    for i, r in enumerate(raw):
        try:
            start = float(r["start_sec"])
            end = float(r["end_sec"])
        except (KeyError, TypeError, ValueError):
            return {"error": f"ranges[{i}] must be {{start_sec, end_sec}} numbers"}
        if start < 0:
            return {"error": f"ranges[{i}]: start_sec must be >= 0"}
        if end - start <= EPS:
            return {"error": f"ranges[{i}]: end_sec must be greater than start_sec"}
        ranges.append((start, end))

    track_ids = None
    if args.get("track_ids"):
        track_ids, err = _parse_json_arg(args["track_ids"], "track_ids")
        if err:
            return err
        if not isinstance(track_ids, list):
            return {"error": "track_ids must be a JSON array of track IDs"}

    ripple = args.get("ripple", True)
    if isinstance(ripple, str):
        ripple = ripple.strip().lower() not in {"false", "0", "no"}

    snapshot = deepcopy(state.current_timeline)
    result = delete_ranges_core(state.current_timeline, ranges, track_ids, bool(ripple))
    if "error" in result:
        state.current_timeline = snapshot
    return result


@registry.register(
    name="insert_gap",
    description=(
        "Insert empty time at a timeline position: clips crossing the point are split, and "
        "everything at/after the point shifts right by duration_sec. Affects all unlocked "
        "tracks unless track_ids is given. "
        "\n\nWhen to use: making room before inserting new footage with add_clips "
        "(insert_gap then add_clips into the gap), pushing content later in time. "
        "When NOT to use: appending at the end of the timeline (just add_clips), "
        "removing time (delete_time_ranges)."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {
            "at_sec": {
                "type": "NUMBER",
                "description": "Timeline position (seconds) where the gap starts.",
            },
            "duration_sec": {
                "type": "NUMBER",
                "description": "Gap length in seconds (> 0).",
            },
            "track_ids": {
                "type": "STRING",
                "description": "Optional JSON array of track IDs to restrict the edit. Default: all unlocked tracks.",
            },
        },
        "required": ["at_sec", "duration_sec"],
    },
)
async def insert_gap(args: dict, state) -> dict:
    if not state.current_timeline:
        return {"error": "No timeline exists. Use create_timeline first."}

    try:
        at_sec = float(args["at_sec"])
        duration = float(args["duration_sec"])
    except (KeyError, TypeError, ValueError):
        return {"error": "at_sec and duration_sec must be numbers"}
    if at_sec < 0:
        return {"error": "at_sec must be >= 0"}
    if duration <= EPS:
        return {"error": "duration_sec must be > 0"}

    track_ids = None
    if args.get("track_ids"):
        track_ids, err = _parse_json_arg(args["track_ids"], "track_ids")
        if err:
            return err
        if not isinstance(track_ids, list):
            return {"error": "track_ids must be a JSON array of track IDs"}

    timeline = state.current_timeline
    if track_ids:
        known = {t.id for t in timeline.tracks}
        missing = [tid for tid in track_ids if tid not in known]
        if missing:
            return {"error": f"Track(s) not found: {', '.join(missing)}"}

    targets = [
        t
        for t in timeline.tracks
        if not t.locked and (not track_ids or t.id in track_ids)
    ]
    if not targets:
        return {"error": "No unlocked target tracks to edit"}

    snapshot = deepcopy(timeline)
    per_track: dict[str, dict] = {}

    for track in targets:
        split_ids: list[str] = []
        shifted = 0
        new_clips: list[Clip] = []
        for clip in list(track.clips):
            cs, ce = clip.timeline_start_sec, clip.timeline_end_sec
            speed = clip.speed or 1.0
            has_source = clip.media_id is not None

            if ce <= at_sec + EPS:
                new_clips.append(clip)
            elif cs >= at_sec - EPS:
                clip.timeline_start_sec = round(cs + duration, 6)
                clip.timeline_end_sec = round(ce + duration, 6)
                shifted += 1
                new_clips.append(clip)
            else:
                # Clip crosses the insertion point — split, shift the tail
                head = clip
                tail = deepcopy(clip)
                tail.id = _gen_id("clip")

                if has_source:
                    src_in = head.source_in_sec or 0
                    head.source_out_sec = round(src_in + (at_sec - cs) * speed, 6)
                    tail.source_in_sec = round(src_in + (at_sec - cs) * speed, 6)
                head.timeline_end_sec = round(at_sec, 6)

                tail_dur = ce - at_sec
                tail.timeline_start_sec = round(at_sec + duration, 6)
                tail.timeline_end_sec = round(at_sec + duration + tail_dur, 6)

                _clamp_fades(head)
                _clamp_fades(tail)
                new_clips.append(head)
                new_clips.append(tail)
                split_ids.append(clip.id)
                shifted += 1

        track.clips = sorted(new_clips, key=lambda c: c.timeline_start_sec)
        per_track[track.id] = {"split": split_ids, "shifted": shifted}

    result = {
        "success": True,
        "gap_start_sec": round(at_sec, 6),
        "gap_end_sec": round(at_sec + duration, 6),
        "per_track": per_track,
        "timeline_duration_sec": round(_timeline_duration(timeline), 6),
    }
    if all(v["shifted"] == 0 and not v["split"] for v in per_track.values()):
        # Nothing moved — gap is past the end of all content; still fine.
        result["note"] = "No clips were affected (insertion point is after all content)."
    _ = snapshot  # snapshot kept for symmetry; no failure paths after edits begin
    return result
