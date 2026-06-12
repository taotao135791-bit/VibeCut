"""Tests for detect_silence parsing and filler-word matching (no ffmpeg/whisper needed)."""

from app.tools.audio_analysis import (
    DEFAULT_FILLERS_EN,
    DEFAULT_FILLERS_ZH,
    find_filler_words,
    parse_silencedetect_output,
)


class TestSilenceParsing:
    def test_parses_start_end_pairs(self):
        stderr = """
[silencedetect @ 0x600] silence_start: 1.25
[silencedetect @ 0x600] silence_end: 3.5 | silence_duration: 2.25
frame= 1000
[silencedetect @ 0x600] silence_start: 10
[silencedetect @ 0x600] silence_end: 10.8 | silence_duration: 0.8
"""
        silences = parse_silencedetect_output(stderr, min_duration=0.5)
        assert silences == [
            {"start": 1.25, "end": 3.5, "duration": 2.25},
            {"start": 10.0, "end": 10.8, "duration": 0.8},
        ]

    def test_filters_below_min_duration(self):
        stderr = """
[silencedetect @ 0x600] silence_start: 1.0
[silencedetect @ 0x600] silence_end: 1.3 | silence_duration: 0.3
"""
        assert parse_silencedetect_output(stderr, min_duration=0.5) == []

    def test_unmatched_start_is_ignored(self):
        stderr = "[silencedetect @ 0x600] silence_start: 5.0\n"
        assert parse_silencedetect_output(stderr, min_duration=0.1) == []


def _seg(words):
    return {
        "start": words[0][1],
        "end": words[-1][2],
        "text": " ".join(w[0] for w in words),
        "words": [{"word": w, "start": s, "end": e} for w, s, e in words],
    }


class TestFillerWords:
    def test_matches_english_fillers_with_punctuation(self):
        segs = [_seg([(" So", 0.0, 0.3), (" um,", 0.3, 0.6), (" hello", 0.6, 1.0)])]
        hits = find_filler_words(segs, DEFAULT_FILLERS_EN, set())
        assert len(hits) == 1
        assert hits[0]["word"] == "um,"
        assert hits[0]["start"] == 0.3
        assert hits[0]["end"] == 0.6

    def test_matches_chinese_fillers(self):
        segs = [_seg([("嗯", 0.0, 0.4), ("我们", 0.4, 0.9), ("呃", 0.9, 1.2), ("继续", 1.2, 1.8)])]
        hits = find_filler_words(segs, DEFAULT_FILLERS_ZH, set())
        assert [h["word"] for h in hits] == ["嗯", "呃"]

    def test_does_not_match_substrings(self):
        """'umbrella' must not match 'um'."""
        segs = [_seg([(" umbrella", 0.0, 0.5)])]
        assert find_filler_words(segs, DEFAULT_FILLERS_EN, set()) == []

    def test_multiword_filler(self):
        segs = [_seg([(" you", 0.0, 0.2), (" know,", 0.2, 0.5), (" right", 0.5, 0.8)])]
        hits = find_filler_words(segs, set(), {"you know"})
        assert len(hits) == 1
        assert hits[0]["start"] == 0.0
        assert hits[0]["end"] == 0.5

    def test_segment_without_words_is_skipped(self):
        segs = [{"start": 0, "end": 1, "text": "um"}]
        assert find_filler_words(segs, DEFAULT_FILLERS_EN, set()) == []
