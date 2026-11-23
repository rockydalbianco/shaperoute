"""Deterministic tests for tools/vario_tones.py: the notes, the beeps a
second, the loops' seams, and the files in the app as the script makes
them."""

from __future__ import annotations

import math
import struct
import wave

import pytest
from vario_tones import (
    ALERT_DIR,
    ALERT_GAP_S,
    ALERT_NOTE_S,
    CLIMB_LEVELS,
    OUT_DIR,
    RATE,
    SINK_LEVELS,
    SINK_SECONDS,
    TASK_DIR,
    TURNPOINT_GAP_S,
    TURNPOINT_HZ,
    TURNPOINT_NOTE_S,
    alert_file,
    climb_beeps,
    climb_file,
    climb_hz,
    sink_file,
    sink_hz,
    turnpoint_file,
)

# The lowest beep: a sink note is always under it.
CLIMB_LOW_HZ_FLOOR = 600.0


def frames_of(data: bytes) -> list[int]:
    return list(struct.unpack(f"<{len(data) // 2}h", data))


def test_climb_goes_from_600_hz_and_2_beeps_to_1600_hz_and_8() -> None:
    assert climb_hz(0) == 600.0
    assert climb_hz(CLIMB_LEVELS - 1) == 1600.0
    assert climb_beeps(0) == 2.0
    assert climb_beeps(CLIMB_LEVELS - 1) == 8.0
    for level in range(1, CLIMB_LEVELS):
        assert climb_hz(level) > climb_hz(level - 1)
        assert climb_beeps(level) > climb_beeps(level - 1)


def test_sink_goes_down_from_400_to_250_hz_in_even_hertz() -> None:
    assert sink_hz(0) == 400.0
    assert sink_hz(SINK_LEVELS - 1) == 250.0
    for level in range(SINK_LEVELS):
        assert sink_hz(level) % 2 == 0
        assert sink_hz(level) < CLIMB_LOW_HZ_FLOOR


@pytest.mark.parametrize("level", range(CLIMB_LEVELS))
def test_a_climb_loop_is_one_beep_then_silence(level: int) -> None:
    _, data = climb_file(level)
    frames = frames_of(data)
    assert len(frames) == round(RATE / climb_beeps(level))
    # It starts and ends at rest: looped, no click.
    assert frames[0] == 0
    assert frames[-1] == 0
    half = len(frames) // 2
    assert max(abs(f) for f in frames[:half]) > 10_000
    assert max(abs(f) for f in frames[half + 1 :]) == 0


@pytest.mark.parametrize("level", range(SINK_LEVELS))
def test_a_sink_loop_is_whole_waves(level: int) -> None:
    _, data = sink_file(level)
    frames = frames_of(data)
    assert len(frames) == round(RATE * SINK_SECONDS)
    waves = sink_hz(level) * SINK_SECONDS
    assert waves == math.floor(waves)
    # The frame after the last is the first again.
    assert frames[0] == 0
    assert abs(frames[-1]) < 3_000


def test_the_app_has_the_files_the_script_makes() -> None:
    names = [climb_file(level)[0] for level in range(CLIMB_LEVELS)]
    names += [sink_file(level)[0] for level in range(SINK_LEVELS)]
    on_disk = sorted(path.name for path in OUT_DIR.glob("*.wav"))
    assert on_disk == sorted(names)
    for level in (0, CLIMB_LEVELS - 1):
        name, data = climb_file(level)
        with wave.open(str(OUT_DIR / name), "rb") as kept:
            assert kept.getframerate() == RATE
            assert kept.getnchannels() == 1
            assert kept.readframes(kept.getnframes()) == data


def test_the_alert_is_two_notes_with_a_gap_and_the_app_has_it() -> None:
    name, data = alert_file()
    frames = frames_of(data)
    assert len(frames) == 2 * (round(RATE * ALERT_NOTE_S) + round(RATE * ALERT_GAP_S))
    assert frames[0] == 0
    assert max(abs(f) for f in frames[-round(RATE * ALERT_GAP_S) :]) == 0
    with wave.open(str(ALERT_DIR / name), "rb") as kept:
        assert kept.readframes(kept.getnframes()) == data


def test_the_turnpoint_is_three_rising_notes_and_the_app_has_it() -> None:
    name, data = turnpoint_file()
    frames = frames_of(data)
    one = round(RATE * TURNPOINT_NOTE_S) + round(RATE * TURNPOINT_GAP_S)
    assert len(frames) == len(TURNPOINT_HZ) * one
    assert list(TURNPOINT_HZ) == sorted(TURNPOINT_HZ)
    assert frames[0] == 0
    assert max(abs(f) for f in frames[-round(RATE * TURNPOINT_GAP_S) :]) == 0
    with wave.open(str(TASK_DIR / name), "rb") as kept:
        assert kept.readframes(kept.getnframes()) == data
