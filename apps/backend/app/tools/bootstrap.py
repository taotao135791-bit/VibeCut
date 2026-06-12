"""Tool registration bootstrap.

The original tool modules register themselves through decorators at import time.
This helper makes that registration available outside the built-in ReAct agent,
for example to REST or MCP-style tool gateways.
"""

from __future__ import annotations

_registered = False


def ensure_tools_registered() -> None:
    global _registered
    if _registered:
        return

    import app.tools.filesystem  # noqa: F401
    import app.tools.shell  # noqa: F401
    import app.tools.timeline_ops  # noqa: F401
    import app.tools.ripple_ops  # noqa: F401
    import app.tools.history  # noqa: F401
    import app.tools.audio_analysis  # noqa: F401
    import app.tools.creative_plan  # noqa: F401
    import app.tools.promo_director  # noqa: F401
    import app.tools.creative_packs  # noqa: F401
    import app.tools.smart_compose  # noqa: F401
    import app.tools.visual_qa  # noqa: F401
    import app.tools.user_interaction  # noqa: F401
    import app.tools.vision  # noqa: F401
    import app.tools.asr  # noqa: F401
    import app.tools.subtitles  # noqa: F401
    import app.tools.time_mapping  # noqa: F401
    import app.tools.export  # noqa: F401
    import app.tools.subtitle_styles  # noqa: F401
    import app.tools.tts  # noqa: F401

    _registered = True


TIMELINE_MODIFYING_TOOLS = {
    "create_timeline",
    "manage_timeline",
    "split_timeline",
    "remove_gap",
    "add_clips",
    "update_clips",
    "delete_clips",
    "move_clips",
    "delete_time_ranges",
    "insert_gap",
    "undo_timeline",
    "redo_timeline",
    "draft_promo_remix",
    "smart_compose",
    "generate_subtitles",
    "apply_subtitle_style",
}

# Read-only / high-frequency tools whose gateway executions are NOT broadcast
# to the UI activity feed (they would just be noise).
QUIET_TOOLS = {
    "get_timeline",
    "map_time",
    "list_files",
    "read_file",
    "list_creative_packs",
    "list_voices",
    "present_plan",
    "ask_user",
}
