"""Tests for ripple editing tools: delete_time_ranges and insert_gap."""

import asyncio

from app.models.timeline import TimelineProject, Track, Clip, MediaAsset, ProjectMeta


def _clip(id, start, end, src_in=None, media_id="vid1", type="video", speed=1.0, **kw):
    if src_in is None:
        src_in = start
    return Clip(
        id=id,
        type=type,
        media_id=media_id,
        source_in_sec=src_in,
        source_out_sec=src_in + (end - start) * speed,
        timeline_start_sec=start,
        timeline_end_sec=end,
        speed=speed,
        **kw,
    )


def _sub_clip(id, start, end, text="hello"):
    return Clip(
        id=id,
        type="subtitle",
        timeline_start_sec=start,
        timeline_end_sec=end,
        subtitle_text=text,
        subtitle_style_ref="default",
    )


def _timeline(video_clips, sub_clips=None) -> TimelineProject:
    tracks = [Track(id="t-video", name="V1", type="video", clips=video_clips)]
    if sub_clips is not None:
        tracks.append(Track(id="t-sub", name="S1", type="subtitle", clips=sub_clips))
    return TimelineProject(
        version="1.0.0",
        project=ProjectMeta(name="Test", width=1920, height=1080, fps=30),
        media_pool=[MediaAsset(id="vid1", path="/test/v.mp4", type="video", duration_sec=300.0)],
        tracks=tracks,
    )


def _state(timeline):
    from app.agent.state import AgentState

    s = AgentState(project_id="test_ripple")
    s.current_timeline = timeline
    return s


def _track(timeline, tid):
    return next(t for t in timeline.tracks if t.id == tid)


class TestDeleteRangesCore:
    def test_range_inside_single_clip_splits_and_ripples(self):
        """Deleting [10, 20) from a 0-60 clip leaves 0-10 + 10-50 (source 20-60)."""
        from app.tools.ripple_ops import delete_ranges_core

        tl = _timeline([_clip("a", 0, 60)])
        result = delete_ranges_core(tl, [(10.0, 20.0)])

        assert result["success"]
        clips = _track(tl, "t-video").clips
        assert len(clips) == 2
        head, tail = clips
        assert head.timeline_end_sec == 10.0
        assert head.source_out_sec == 10.0
        assert tail.timeline_start_sec == 10.0
        assert tail.timeline_end_sec == 50.0
        assert tail.source_in_sec == 20.0
        assert tail.source_out_sec == 60.0
        assert result["timeline_duration_sec"] == 50.0

    def test_clip_fully_inside_range_is_removed(self):
        from app.tools.ripple_ops import delete_ranges_core

        tl = _timeline([_clip("a", 0, 10), _clip("b", 10, 20, src_in=100), _clip("c", 20, 30, src_in=200)])
        result = delete_ranges_core(tl, [(10.0, 20.0)])

        clips = _track(tl, "t-video").clips
        assert [c.id for c in clips] == ["a", "c"]
        assert clips[1].timeline_start_sec == 10.0
        assert clips[1].timeline_end_sec == 20.0
        # Source range of the shifted clip is untouched
        assert clips[1].source_in_sec == 200.0
        assert "b" in result["per_track"]["t-video"]["removed"]

    def test_boundary_crossing_clips_are_trimmed(self):
        """Range [15, 25) over clips [10,20) and [20,30): trim tail of first, head of second."""
        from app.tools.ripple_ops import delete_ranges_core

        tl = _timeline([_clip("a", 10, 20, src_in=0), _clip("b", 20, 30, src_in=50)])
        delete_ranges_core(tl, [(15.0, 25.0)])

        clips = _track(tl, "t-video").clips
        assert len(clips) == 2
        a, b = clips
        assert a.timeline_end_sec == 15.0
        assert a.source_out_sec == 5.0  # kept first 5s of source
        assert b.timeline_start_sec == 15.0
        assert b.timeline_end_sec == 20.0
        assert b.source_in_sec == 55.0  # dropped first 5s of source

    def test_multiple_ranges_processed_correctly(self):
        """Two ranges on one 0-100 clip: [10,20) and [50,60) → 80s total."""
        from app.tools.ripple_ops import delete_ranges_core

        tl = _timeline([_clip("a", 0, 100)])
        result = delete_ranges_core(tl, [(10.0, 20.0), (50.0, 60.0)])

        clips = _track(tl, "t-video").clips
        assert len(clips) == 3
        assert result["timeline_duration_sec"] == 80.0
        # Continuity: each clip starts where the previous ends
        assert clips[0].timeline_end_sec == clips[1].timeline_start_sec
        assert clips[1].timeline_end_sec == clips[2].timeline_start_sec
        # Source ranges skip the deleted material
        assert clips[0].source_out_sec == 10.0
        assert clips[1].source_in_sec == 20.0
        assert clips[1].source_out_sec == 50.0
        assert clips[2].source_in_sec == 60.0

    def test_unsorted_overlapping_ranges_are_merged(self):
        from app.tools.ripple_ops import delete_ranges_core

        tl = _timeline([_clip("a", 0, 100)])
        result = delete_ranges_core(tl, [(50.0, 60.0), (10.0, 20.0), (15.0, 25.0)])

        assert result["ranges_deleted"] == [
            {"start_sec": 10.0, "end_sec": 25.0},
            {"start_sec": 50.0, "end_sec": 60.0},
        ]
        assert result["timeline_duration_sec"] == 75.0

    def test_subtitle_track_stays_in_sync(self):
        """Subtitles shift with video when a range is ripple-deleted."""
        from app.tools.ripple_ops import delete_ranges_core

        tl = _timeline(
            [_clip("a", 0, 60)],
            sub_clips=[_sub_clip("s1", 5, 9), _sub_clip("s2", 30, 35)],
        )
        delete_ranges_core(tl, [(10.0, 20.0)])

        subs = _track(tl, "t-sub").clips
        assert subs[0].timeline_start_sec == 5.0  # before range: untouched
        assert subs[1].timeline_start_sec == 20.0  # was 30, shifted by 10
        assert subs[1].timeline_end_sec == 25.0
        assert subs[1].subtitle_text == "hello"

    def test_subtitle_spanning_range_is_split_without_source(self):
        from app.tools.ripple_ops import delete_ranges_core

        tl = _timeline([_clip("a", 0, 60)], sub_clips=[_sub_clip("s1", 5, 30)])
        delete_ranges_core(tl, [(10.0, 20.0)])

        subs = _track(tl, "t-sub").clips
        assert len(subs) == 2
        assert subs[0].timeline_end_sec == 10.0
        assert subs[1].timeline_start_sec == 10.0
        assert subs[1].timeline_end_sec == 20.0
        # Subtitle clips have no source media — must not invent one
        assert subs[1].media_id is None

    def test_no_ripple_leaves_gap(self):
        from app.tools.ripple_ops import delete_ranges_core

        tl = _timeline([_clip("a", 0, 10), _clip("b", 10, 20, src_in=100)])
        delete_ranges_core(tl, [(0.0, 10.0)], ripple=False)

        clips = _track(tl, "t-video").clips
        assert [c.id for c in clips] == ["b"]
        assert clips[0].timeline_start_sec == 10.0  # not shifted

    def test_locked_track_is_untouched(self):
        from app.tools.ripple_ops import delete_ranges_core

        tl = _timeline([_clip("a", 0, 60)], sub_clips=[_sub_clip("s1", 30, 40)])
        _track(tl, "t-sub").locked = True
        delete_ranges_core(tl, [(0.0, 20.0)])

        subs = _track(tl, "t-sub").clips
        assert subs[0].timeline_start_sec == 30.0

    def test_speed_adjusted_source_math(self):
        """At 2x speed, deleting 5s of timeline removes 10s of source."""
        from app.tools.ripple_ops import delete_ranges_core

        # 2x speed: source 0-60 plays in timeline 0-30
        clip = Clip(
            id="fast",
            type="video",
            media_id="vid1",
            source_in_sec=0,
            source_out_sec=60,
            timeline_start_sec=0,
            timeline_end_sec=30,
            speed=2.0,
        )
        tl = _timeline([clip])
        delete_ranges_core(tl, [(10.0, 15.0)])

        clips = _track(tl, "t-video").clips
        head, tail = clips
        assert head.source_out_sec == 20.0  # 10s timeline * 2x
        assert tail.source_in_sec == 30.0  # 15s timeline * 2x
        assert tail.timeline_start_sec == 10.0
        assert tail.timeline_end_sec == 25.0

    def test_unknown_track_id_errors(self):
        from app.tools.ripple_ops import delete_ranges_core

        tl = _timeline([_clip("a", 0, 60)])
        result = delete_ranges_core(tl, [(0.0, 5.0)], track_ids=["nope"])
        assert "error" in result


class TestDeleteTimeRangesTool:
    def test_tool_validates_and_rolls_back(self):
        from app.tools.ripple_ops import delete_time_ranges

        tl = _timeline([_clip("a", 0, 60)])
        state = _state(tl)
        result = asyncio.run(
            delete_time_ranges({"ranges": '[{"start_sec": 5, "end_sec": 3}]'}, state)
        )
        assert "error" in result
        # Timeline unchanged
        assert len(state.current_timeline.tracks[0].clips) == 1

    def test_tool_happy_path_json_string_args(self):
        from app.tools.ripple_ops import delete_time_ranges

        state = _state(_timeline([_clip("a", 0, 60)]))
        result = asyncio.run(
            delete_time_ranges(
                {"ranges": '[{"start_sec": 10, "end_sec": 20}]', "ripple": True}, state
            )
        )
        assert result["success"]
        assert result["timeline_duration_sec"] == 50.0

    def test_validator_accepts_result(self):
        """Output of a multi-range ripple delete passes full timeline validation."""
        from app.tools.ripple_ops import delete_ranges_core
        from app.services.timeline_validator import validate_timeline

        tl = _timeline(
            [_clip("a", 0, 30), _clip("b", 30, 70, src_in=100), _clip("c", 70, 100, src_in=200)],
            sub_clips=[_sub_clip("s1", 5, 40), _sub_clip("s2", 60, 90)],
        )
        delete_ranges_core(tl, [(25.0, 35.0), (65.0, 75.0), (90.0, 95.0)])
        assert validate_timeline(tl) == []


class TestInsertGap:
    def test_insert_splits_and_shifts(self):
        from app.tools.ripple_ops import insert_gap

        state = _state(_timeline([_clip("a", 0, 30), _clip("b", 30, 40, src_in=100)]))
        result = asyncio.run(insert_gap({"at_sec": 15, "duration_sec": 5}, state))

        assert result["success"]
        clips = _track(state.current_timeline, "t-video").clips
        assert len(clips) == 3
        head, tail, b = clips
        assert head.timeline_end_sec == 15.0
        assert tail.timeline_start_sec == 20.0
        assert tail.timeline_end_sec == 35.0
        assert tail.source_in_sec == 15.0
        assert b.timeline_start_sec == 35.0

    def test_insert_result_is_valid(self):
        from app.tools.ripple_ops import insert_gap
        from app.services.timeline_validator import validate_timeline

        state = _state(
            _timeline([_clip("a", 0, 30)], sub_clips=[_sub_clip("s1", 10, 20)])
        )
        result = asyncio.run(insert_gap({"at_sec": 12, "duration_sec": 3}, state))
        assert result["success"]
        assert validate_timeline(state.current_timeline) == []

    def test_insert_after_content_is_noop(self):
        from app.tools.ripple_ops import insert_gap

        state = _state(_timeline([_clip("a", 0, 10)]))
        result = asyncio.run(insert_gap({"at_sec": 50, "duration_sec": 5}, state))
        assert result["success"]
        assert "note" in result
