"""Draw `apps/mobile/assets/ui/scrim.png`, the dark under the words on a photo.

One column of 128 pixels in the app's `scrim` colour (`#0B0A08`), clear at
the top and 82 % opaque at the bottom along a smoothstep, so the top edge
has no seam. `src/ui/Scrim.tsx` stretches it to the box (TASK-339,
ADR-0293). No Pillow: the PNG is written by hand.

    python tools/ui_scrim.py
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "apps/mobile/assets/ui/scrim.png"
WIDTH, HEIGHT = 1, 128
RGB = (0x0B, 0x0A, 0x08)
PEAK_ALPHA = 0.82


def rows() -> bytes:
    out = bytearray()
    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        smooth = t * t * (3 - 2 * t)
        alpha = round(255 * PEAK_ALPHA * smooth)
        out += b"\x00" + bytes([*RGB, alpha]) * WIDTH
    return bytes(out)


def chunk(tag: bytes, data: bytes) -> bytes:
    body = tag + data
    crc = struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)
    return struct.pack(">I", len(data)) + body + crc


def png() -> bytes:
    header = struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(rows(), 9))
        + chunk(b"IEND", b"")
    )


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(png())
    print(f"{OUT} ({OUT.stat().st_size} bytes)")
