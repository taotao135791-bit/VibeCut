"""Audio analysis tools that need no LLM: silence detection (ffmpeg) and
filler-word detection (word-level transcript + wordlist matching).

Both return SOURCE-time ranges, ready to feed into map_time
(source_to_timeline) and then delete_time_ranges.
"""

from __future__ import annotations

import asyncio
import json
import re
import shutil
from pathlib import Path

from app.config import settings
from app.tools.registry import registry


def _find_ffmpeg() -> str:
    if settings.ffmpeg_path:
        return settings.ffmpeg_path
    path = shutil.which("ffmpeg")
    if path:
        return path
    raise RuntimeError("FFmpeg not found. Install ffmpeg or set MRDV2_FFMPEG_PATH.")


def get_transcript_json_path(media_path: Path) -> Path:
    """Word-level transcript cache written by transcribe_audio."""
    return media_path.parent / f"{media_path.stem}_transcript.json"


# ──────────────────────────────────────────────
# detect_silence
# ──────────────────────────────────────────────

_SILENCE_START_RE = re.compile(r"silence_start:\s*([0-9.]+)")
_SILENCE_END_RE = re.compile(r"silence_end:\s*([0-9.]+)")


def parse_silencedetect_output(stderr: str, min_duration: float) -> list[dict]:
    """Parse ffmpeg silencedetect stderr into [{start, end, duration}]."""
    silences: list[dict] = []
    current_start: float | None = None
    for line in stderr.splitlines():
        m = _SILENCE_START_RE.search(line)
        if m:
            current_start = float(m.group(1))
            continue
        m = _SILENCE_END_RE.search(line)
        if m and current_start is not None:
            end = float(m.group(1))
            dur = end - current_start
            if dur >= min_duration:
                silences.append({
                    "start": round(max(0.0, current_start), 3),
                    "end": round(end, 3),
                    "duration": round(dur, 3),
                })
            current_start = None
    return silences


@registry.register(
    name="detect_silence",
    description=(
        "Detect silent segments in a media file using ffmpeg (no LLM, fast and local). "
        "Returns SOURCE-time ranges [{start, end, duration}]. "
        "\n\nTypical flow for tightening a talking-head video: detect_silence → "
        "(optionally keep `padding_sec` of breathing room) → map_time source_to_timeline → delete_time_ranges. "
        "\n\nWhen to use: removing dead air / long pauses, finding speech boundaries. "
        "When NOT to use: detecting filler words like 'um' (use detect_filler_words after transcribe_audio)."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {
            "file_path": {
                "type": "STRING",
                "description": "Absolute path to the video/audio file.",
            },
            "noise_db": {
                "type": "NUMBER",
                "description": "Silence threshold in dBFS (default -35). Lower = stricter (e.g. -45 only counts near-total silence).",
            },
            "min_duration_sec": {
                "type": "NUMBER",
                "description": "Minimum silence length in seconds to report (default 0.5).",
            },
            "padding_sec": {
                "type": "NUMBER",
                "description": "Shrink each reported range by this much on BOTH sides to keep natural breathing room (default 0.1). "
                "Ranges that become shorter than min_duration_sec after padding are dropped.",
            },
        },
        "required": ["file_path"],
    },
)
async def detect_silence(args: dict, state) -> dict:
    file_path = Path(args["file_path"]).resolve()
    if not file_path.is_file():
        return {"error": f"File not found: {args['file_path']}"}

    noise_db = float(args.get("noise_db", -35))
    min_duration = float(args.get("min_duration_sec", 0.5))
    padding = max(0.0, float(args.get("padding_sec", 0.1)))
    if min_duration <= 0:
        return {"error": "min_duration_sec must be > 0"}

    try:
        ffmpeg = _find_ffmpeg()
    except RuntimeError as e:
        return {"error": str(e)}

    cmd = [
        ffmpeg, "-hide_banner", "-nostats",
        "-i", str(file_path),
        "-af", f"silencedetect=noise={noise_db}dB:d={min_duration}",
        "-f", "null", "-",
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=600)
    except asyncio.TimeoutError:
        proc.kill()
        return {"error": "detect_silence timed out after 600s"}

    if proc.returncode != 0:
        tail = stderr.decode(errors="replace").strip().splitlines()[-3:]
        return {"error": f"ffmpeg failed (code {proc.returncode}): {' | '.join(tail)}"}

    silences = parse_silencedetect_output(stderr.decode(errors="replace"), min_duration)

    if padding > 0:
        padded = []
        for s in silences:
            start = s["start"] + padding
            end = s["end"] - padding
            if end - start >= min_duration:
                padded.append({
                    "start": round(start, 3),
                    "end": round(end, 3),
                    "duration": round(end - start, 3),
                })
        silences = padded

    total = round(sum(s["duration"] for s in silences), 3)
    return {
        "success": True,
        "file": str(file_path),
        "note": "Times are SOURCE time. Use map_time (source_to_timeline) before delete_time_ranges if the timeline has been edited.",
        "params": {"noise_db": noise_db, "min_duration_sec": min_duration, "padding_sec": padding},
        "silence_count": len(silences),
        "total_silence_sec": total,
        "silences": silences,
    }


# ──────────────────────────────────────────────
# detect_filler_words
# ──────────────────────────────────────────────

# Conservative defaults: pure hesitation sounds that are near-always safe to cut.
DEFAULT_FILLERS_EN = {"um", "uh", "uhm", "umm", "er", "erm", "hmm", "mm", "mhm", "hm"}
DEFAULT_FILLERS_ZH = {"嗯", "呃", "啊", "唔", "呐", "嘛"}
# Higher-risk verbal tics — only matched when aggressive=true.
AGGRESSIVE_FILLERS_EN = {"like", "you know", "i mean", "actually", "basically", "literally", "right", "so", "well", "okay"}
AGGRESSIVE_FILLERS_ZH = {"那个", "这个", "就是说", "就是", "然后", "其实", "反正", "对吧", "是吧"}

_WORD_STRIP_RE = re.compile(r"[\s,.\u3002\uff0c\uff1f\uff01?!;:\u201c\u201d\"'()\uff08\uff09\u3001~\u2026-]+")


def _normalize_word(word: str) -> str:
    return _WORD_STRIP_RE.sub("", word).lower()


def find_filler_words(
    segments: list[dict],
    fillers: set[str],
    multi_word_fillers: set[str],
) -> list[dict]:
    """Scan word-level transcript segments for filler words.

    Single-token fillers must match a whole (normalized) word exactly.
    Multi-word fillers match consecutive word sequences.
    """
    hits: list[dict] = []
    multi_seqs = [f.split() for f in multi_word_fillers]

    for seg in segments:
        words = seg.get("words") or []
        norm = [_normalize_word(w.get("word", "")) for w in words]

        i = 0
        while i < len(words):
            matched = False
            # Multi-word sequences first (longest possible match)
            for seq in sorted(multi_seqs, key=len, reverse=True):
                n = len(seq)
                if n > 1 and i + n <= len(words) and norm[i : i + n] == seq:
                    hits.append({
                        "word": " ".join(w["word"].strip() for w in words[i : i + n]),
                        "start": round(float(words[i]["start"]), 3),
                        "end": round(float(words[i + n - 1]["end"]), 3),
                    })
                    i += n
                    matched = True
                    break
            if matched:
                continue
            if norm[i] in fillers:
                hits.append({
                    "word": words[i]["word"].strip(),
                    "start": round(float(words[i]["start"]), 3),
                    "end": round(float(words[i]["end"]), 3),
                })
            i += 1

    return hits


@registry.register(
    name="detect_filler_words",
    description=(
        "Find filler words (\u53e3\u5934\u7985: \u55ef/\u5446/um/uh\u2026) in a previously transcribed media file, "
        "using the word-level timestamps cached by transcribe_audio (run that first). No LLM needed. "
        "Returns SOURCE-time ranges for each hit. "
        "\n\nTypical flow: transcribe_audio → detect_filler_words → review the list → "
        "map_time source_to_timeline → delete_time_ranges. "
        "\n\nWhen to use: cleaning up speech by removing hesitation sounds. "
        "When NOT to use: the file has not been transcribed yet (call transcribe_audio first), "
        "or you need semantic judgement about which sentences to keep (read the transcript yourself)."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {
            "file_path": {
                "type": "STRING",
                "description": "Absolute path to the media file (must have been transcribed already).",
            },
            "aggressive": {
                "type": "BOOLEAN",
                "description": "Also match risky verbal tics (\u90a3\u4e2a/\u5c31\u662f/like/you know\u2026). "
                "Default false — these often carry meaning, review hits before deleting.",
            },
            "custom_words": {
                "type": "STRING",
                "description": "Optional JSON array of extra filler words/phrases to match, e.g. [\"\u5bf9\u5427\", \"sort of\"].",
            },
            "padding_sec": {
                "type": "NUMBER",
                "description": "Expand each hit by this much on both sides so cuts don't clip adjacent audio (default 0.03).",
            },
        },
        "required": ["file_path"],
    },
)
async def detect_filler_words(args: dict, state) -> dict:
    file_path = Path(args["file_path"]).resolve()
    if not file_path.is_file():
        return {"error": f"File not found: {args['file_path']}"}

    transcript_path = get_transcript_json_path(file_path)
    if not transcript_path.is_file():
        return {
            "error": (
                f"No word-level transcript found at {transcript_path}. "
                "Run transcribe_audio on this file first."
            )
        }

    try:
        transcript = json.loads(transcript_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        return {"error": f"Failed to read transcript cache: {e}"}

    segments = transcript.get("segments", [])
    if not any(seg.get("words") for seg in segments):
        return {
            "error": "Transcript cache has no word-level timestamps. Re-run transcribe_audio."
        }

    aggressive = args.get("aggressive", False)
    if isinstance(aggressive, str):
        aggressive = aggressive.strip().lower() in {"true", "1", "yes"}

    fillers = set(DEFAULT_FILLERS_EN) | set(DEFAULT_FILLERS_ZH)
    multi: set[str] = set()
    if aggressive:
        for w in AGGRESSIVE_FILLERS_EN | AGGRESSIVE_FILLERS_ZH:
            (multi if " " in w else fillers).add(w)

    if args.get("custom_words"):
        try:
            raw = args["custom_words"]
            custom = json.loads(raw) if isinstance(raw, str) else raw
        except json.JSONDecodeError as e:
            return {"error": f"Invalid custom_words JSON: {e}"}
        if not isinstance(custom, list):
            return {"error": "custom_words must be a JSON array of strings"}
        for w in custom:
            w = _normalize_word(str(w)) if " " not in str(w) else str(w).strip().lower()
            if w:
                (multi if " " in w else fillers).add(w)

    padding = max(0.0, float(args.get("padding_sec", 0.03)))

    hits = find_filler_words(segments, fillers, multi)
    if padding > 0:
        for h in hits:
            h["start"] = round(max(0.0, h["start"] - padding), 3)
            h["end"] = round(h["end"] + padding, 3)

    total = round(sum(h["end"] - h["start"] for h in hits), 3)
    return {
        "success": True,
        "file": str(file_path),
        "note": "Times are SOURCE time. Use map_time (source_to_timeline) before delete_time_ranges if the timeline has been edited.",
        "aggressive": bool(aggressive),
        "filler_count": len(hits),
        "total_filler_sec": total,
        "fillers": hits,
    }
