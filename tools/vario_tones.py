"""Makes the tones of the paragliding vario (TASK-479 part C, ADR-0388).

The app cannot make a sound of its own: it plays files. So the vario is a
set of short loops, ours, one per step of climb and of sink:

- ``climb-00.wav`` … ``climb-10.wav``, a climb of 0, 0.5, … 5 m/s: one beep
  and its silence, so a loop is a beeping. The note goes from 600 Hz at
  0 m/s to 1600 Hz at 5 m/s, the beeps from 2 to 8 a second;
- ``sink-0.wav`` … ``sink-3.wav``, a sink of 2, 3, 4, 5 m/s and more: a
  steady low note, from 400 Hz down to 250 Hz, half a second of whole
  waves, so a loop has no seam.

All are 16-bit mono WAV files made with the standard library only. Run
from the repository's root:

    python3 tools/vario_tones.py

The files go to apps/mobile/assets/sounds/vario/, which the app bundles
like its images. ``apps/mobile/src/air/varioTone.ts`` holds the same
numbers: a level there is a file here.

Since part E2, also ``alert.wav`` in apps/mobile/assets/sounds/airspace/:
the airspace warning, two falling notes (880 Hz, then 660 Hz), played once
when a volume of the pilot's file comes within the warning's distance.
"""

from __future__ import annotations

import math
import struct
import wave
from collections.abc import Callable
from pathlib import Path

RATE = 22_050
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "apps" / "mobile" / "assets" / "sounds" / "vario"
ALERT_DIR = ROOT / "apps" / "mobile" / "assets" / "sounds" / "airspace"

CLIMB_STEP_MPS = 0.5
CLIMB_LEVELS = 11
CLIMB_LOW_HZ = 600.0
CLIMB_HIGH_HZ = 1600.0
CLIMB_SLOW_BEEPS = 2.0
CLIMB_FAST_BEEPS = 8.0
CLIMB_TOP_MPS = CLIMB_STEP_MPS * (CLIMB_LEVELS - 1)
# The share of a beep's period that sounds; the rest is silence.
BEEP_SHARE = 0.5
BEEP_PEAK = 0.7
# The fade at both ends of a beep, so it never clicks.
BEEP_FADE_S = 0.006

SINK_FIRST_MPS = 2.0
SINK_LEVELS = 4
SINK_HIGH_HZ = 400.0
SINK_LOW_HZ = 250.0
SINK_SECONDS = 0.5
SINK_PEAK = 0.55

ALERT_HZ = (880.0, 660.0)
ALERT_NOTE_S = 0.18
ALERT_GAP_S = 0.06


def climb_mps(level: int) -> float:
    """The climb of `level`, m/s."""
    return level * CLIMB_STEP_MPS


def climb_hz(level: int) -> float:
    """The note of `level`'s beep."""
    share = climb_mps(level) / CLIMB_TOP_MPS
    return CLIMB_LOW_HZ + (CLIMB_HIGH_HZ - CLIMB_LOW_HZ) * share


def climb_beeps(level: int) -> float:
    """How many beeps a second at `level`."""
    share = climb_mps(level) / CLIMB_TOP_MPS
    return CLIMB_SLOW_BEEPS + (CLIMB_FAST_BEEPS - CLIMB_SLOW_BEEPS) * share


def sink_hz(level: int) -> float:
    """The note of the sink at `level`, rounded to an even number of hertz:
    half a second then holds whole waves."""
    share = level / (SINK_LEVELS - 1)
    hz = SINK_HIGH_HZ - (SINK_HIGH_HZ - SINK_LOW_HZ) * share
    return 2.0 * round(hz / 2.0)


def beep(hz: float, sounding_s: float) -> Callable[[float], float]:
    """A beep of `hz` that sounds for `sounding_s`, then is silent."""

    def sound(t: float) -> float:
        if t >= sounding_s:
            return 0.0
        fade = min(1.0, t / BEEP_FADE_S, (sounding_s - t) / BEEP_FADE_S)
        return BEEP_PEAK * fade * math.sin(2 * math.pi * hz * t)

    return sound


def steady(hz: float) -> Callable[[float], float]:
    """A steady note of `hz`."""
    return lambda t: SINK_PEAK * math.sin(2 * math.pi * hz * t)


def samples(sound: Callable[[float], float], frames: int) -> bytes:
    """`frames` frames of `sound`, 16-bit little-endian."""
    return b"".join(
        struct.pack("<h", int(max(-1.0, min(1.0, sound(i / RATE))) * 32767))
        for i in range(frames)
    )


def write(path: Path, data: bytes) -> None:
    """Writes `data` to `path` as a mono WAV file."""
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(data)


def climb_file(level: int) -> tuple[str, bytes]:
    """The name and the frames of the climb loop of `level`."""
    frames = round(RATE / climb_beeps(level))
    sounding = frames * BEEP_SHARE / RATE
    return f"climb-{level:02d}.wav", samples(beep(climb_hz(level), sounding), frames)


def sink_file(level: int) -> tuple[str, bytes]:
    """The name and the frames of the sink loop of `level`."""
    frames = round(RATE * SINK_SECONDS)
    return f"sink-{level}.wav", samples(steady(sink_hz(level)), frames)


def alert_file() -> tuple[str, bytes]:
    """The name and the frames of the airspace warning: two notes, a gap
    between them and after."""
    note = round(RATE * ALERT_NOTE_S)
    gap = round(RATE * ALERT_GAP_S)
    data = b""
    for hz in ALERT_HZ:
        data += samples(beep(hz, ALERT_NOTE_S), note)
        data += samples(lambda t: 0.0, gap)
    return "alert.wav", data


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    files = [climb_file(level) for level in range(CLIMB_LEVELS)]
    files += [sink_file(level) for level in range(SINK_LEVELS)]
    for name, data in files:
        write(OUT_DIR / name, data)
        print(f"{OUT_DIR / name}: {len(data) // 2} frames")
    ALERT_DIR.mkdir(parents=True, exist_ok=True)
    name, data = alert_file()
    write(ALERT_DIR / name, data)
    print(f"{ALERT_DIR / name}: {len(data) // 2} frames")


if __name__ == "__main__":
    main()
