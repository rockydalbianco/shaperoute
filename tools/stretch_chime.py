"""Makes the short sounds of the stretching exercises (TASK-285 part B,
TASK-466 part A, ADR-0378).

- ``ding.wav``, between two exercises: a bell-like «ding», ours, two sine
  waves (a note and its harmonic) that fade out over a third of a second;
- ``tick.wav``, the last seconds of a hold and the start of one: a short,
  soft «tick» a fifth above the bell, gone in a tenth of a second.

Both are 16-bit mono WAV files made with the standard library only. Run
from the repository's root:

    python3 tools/stretch_chime.py

The files go to apps/mobile/assets/stretch/, which the app bundles like
its images.
"""

from __future__ import annotations

import math
import struct
import wave
from collections.abc import Callable
from pathlib import Path

RATE = 22_050
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "apps" / "mobile" / "assets" / "stretch"

DING_SECONDS = 0.35
DING_HZ = 880.0
DING_HARMONIC_HZ = 1760.0
DING_PEAK = 0.6

TICK_SECONDS = 0.1
TICK_HZ = 1320.0
TICK_PEAK = 0.45


def ding(t: float) -> float:
    """The bell at `t` seconds, from -1 to 1: a struck note that fades."""
    attack = min(1.0, t / 0.004)
    fade = math.exp(-t * 9.0)
    note = math.sin(2 * math.pi * DING_HZ * t)
    harmonic = 0.35 * math.sin(2 * math.pi * DING_HARMONIC_HZ * t) * math.exp(-t * 14.0)
    return DING_PEAK * attack * fade * (note + harmonic) / 1.35


def tick(t: float) -> float:
    """The tick at `t` seconds, from -1 to 1: a quick note, quickly gone."""
    attack = min(1.0, t / 0.002)
    fade = math.exp(-t * 45.0)
    return TICK_PEAK * attack * fade * math.sin(2 * math.pi * TICK_HZ * t)


def write(name: str, sound: Callable[[float], float], seconds: float) -> None:
    """Writes `sound` for `seconds` to `OUT_DIR / name`."""
    frames = int(RATE * seconds)
    data = b"".join(
        struct.pack("<h", int(max(-1.0, min(1.0, sound(i / RATE))) * 32767))
        for i in range(frames)
    )
    out = OUT_DIR / name
    out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(data)
    print(f"{out} ({out.stat().st_size} bytes, {seconds} s)")


def main() -> None:
    write("ding.wav", ding, DING_SECONDS)
    write("tick.wav", tick, TICK_SECONDS)


if __name__ == "__main__":
    main()
