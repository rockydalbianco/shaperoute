"""The outline of the subject of an image (TASK-072).

One clear subject on a plain background (a drawing, a logo, a silhouette,
an object photographed on a white table) becomes an Outline, like the
files in `outlines/`: only its outside line, without holes or inner lines.
Everything is decided here, by fixed rules, the same image giving the same
outline every time; an image the rules cannot read is refused with the
reason (InvalidImageError), never turned into a shape at random.

1. The image, PNG or JPEG, is turned upright (EXIF) and reduced to at most
   ANALYSIS_SIDE pixels a side.
2. The background is what the border of the image shows: its colour is the
   median of the border, and most of the border must be of that colour (the
   background is uniform). An image transparent around the subject uses its
   transparency instead.
3. The subject is every pixel far enough from that colour. Its pieces are
   found as polygons of pixels; specks are left out, and the largest piece
   must be nearly all of the rest (one subject) and keep off the border.
4. Its outside line is smoothed at the scale roads can draw: parts thinner
   than 2 × SMOOTH_SHARE of the subject are dropped, and gaps as narrow are
   closed (ADR-0039: thin details do not survive on roads). Then it is
   simplified to its corners, which must be at most MAX_POINTS.

The result goes through parse_outline, the check every outline file passes.
It lives outside `shapes/`, which reads outlines with the standard library
only: tracing one needs Pillow, numpy and shapely.
"""

from __future__ import annotations

import io
from pathlib import Path

import numpy as np
import shapely
from PIL import Image, ImageOps
from shapely import affinity
from shapely.geometry import MultiPolygon, Polygon

from route_engine.shapes.outline import InvalidOutlineError, Outline, parse_outline

FORMATS = ("PNG", "JPEG")
# The image is analysed at most this many pixels a side.
ANALYSIS_SIDE = 640
# The border that shows the background: this share of the longer side, at
# least 2 pixels.
BORDER_SHARE = 0.02
# The background is uniform when BACKGROUND_SHARE of the border is within
# BACKGROUND_SPREAD of its median colour (RGB, 0-441); the rest of the
# border may be the subject, which is then refused for touching the edge.
BACKGROUND_SPREAD = 40.0
BACKGROUND_SHARE = 0.7
# A pixel is subject when this far from the background colour, or twice the
# spread of the background along the border if that is more.
MIN_CONTRAST = 60.0
# Pieces smaller than this share of the largest one are specks.
SPECK_SHARE = 0.01
# The largest piece must be this share of the subject, specks left out.
MAIN_SHARE = 0.75
# The subject's longer side, in analysed pixels.
MIN_SUBJECT_PX = 48
# Parts thinner than twice this share of the subject's longer side are
# dropped, and gaps as narrow closed.
SMOOTH_SHARE = 0.01
# The outline keeps the corners this far from the straight line, as a
# share of the subject's longer side.
SIMPLIFY_SHARE = 0.01
MAX_POINTS = 100
# A pixel of an image with transparency is subject when at least this opaque.
OPAQUE = 128


class InvalidImageError(ValueError):
    """The image does not give one clear outline. `reason` says why, in a
    word a caller can map to its own message."""

    def __init__(self, reason: str, message: str) -> None:
        super().__init__(message)
        self.reason = reason


def outline_from_image(
    image: bytes | Path, name: str = "image", source: str = "an image"
) -> Outline:
    """The Outline of the subject of `image`, a PNG or JPEG file or its
    bytes, named `name`; `source` says where the image comes from."""
    return parse_outline(outline_data(image, name, source))


def outline_data(
    image: bytes | Path, name: str = "image", source: str = "an image"
) -> dict[str, object]:
    """The outline of `image` as an outline file holds it (outline.py): the
    corners in pixels of the analysed image, x to the right and y upwards.
    Written as JSON, it is read back by read_outline as the same Outline."""
    subject = _subject_mask(_load(image))
    polygon = _main_piece(subject)
    points = _corners(polygon)
    data: dict[str, object] = {
        "name": name,
        "source": f"outline traced from {source} (TASK-072)",
        "license": "as the image",
        "points": points,
    }
    try:
        parse_outline(data)
    except InvalidOutlineError as exc:  # not seen: a smoothed line is simple
        raise InvalidImageError("jagged", f"the outline is not usable: {exc}") from None
    return data


def _load(image: bytes | Path) -> Image.Image:
    try:
        raw = image.read_bytes() if isinstance(image, Path) else image
        picture = Image.open(io.BytesIO(raw))
        kind = picture.format
        if kind in FORMATS:
            picture.draft("RGB", (ANALYSIS_SIDE, ANALYSIS_SIDE))  # JPEG only
            picture = ImageOps.exif_transpose(picture)
            picture.thumbnail((ANALYSIS_SIDE, ANALYSIS_SIDE), Image.Resampling.LANCZOS)
    except OSError as exc:  # UnidentifiedImageError too
        raise InvalidImageError(
            "unreadable", f"cannot read the image: {exc.strerror or exc}"
        ) from None
    except (Image.DecompressionBombError, ValueError) as exc:
        raise InvalidImageError("unreadable", f"cannot read the image: {exc}") from None
    if kind not in FORMATS:
        raise InvalidImageError(
            "format", f"only PNG and JPEG images are supported, got {kind}"
        )
    return picture


def _border(values: np.ndarray) -> np.ndarray:
    """The pixels of the border of an image array, in any order."""
    height, width = values.shape[:2]
    band = max(2, round(BORDER_SHARE * max(width, height)))
    band = min(band, height // 2, width // 2)
    keep = np.zeros((height, width), dtype=bool)
    keep[:band, :] = keep[-band:, :] = True
    keep[:, :band] = keep[:, -band:] = True
    return values[keep]


def _subject_mask(picture: Image.Image) -> np.ndarray:
    """True where the subject is: rows top to bottom, columns left to right."""
    if min(picture.size) < 2 * MIN_SUBJECT_PX:
        raise InvalidImageError(
            "small", f"the image is too small: {picture.width}×{picture.height} pixels"
        )
    if picture.mode in ("RGBA", "LA", "PA") or "transparency" in picture.info:
        rgba = picture.convert("RGBA")
        alpha = np.asarray(rgba.getchannel("A"))
        if np.mean(_border(alpha) < OPAQUE) >= 0.95:
            return alpha >= OPAQUE
        white = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        picture = Image.alpha_composite(white, rgba)
    rgb = np.asarray(picture.convert("RGB"), dtype=float)
    border = _border(rgb)
    background = np.median(border, axis=0)
    off = np.linalg.norm(border - background, axis=1)
    near = off[off <= BACKGROUND_SPREAD]
    if len(near) < BACKGROUND_SHARE * len(off):
        raise InvalidImageError(
            "background",
            "the background is not uniform: the image needs one subject "
            "on a plain background",
        )
    distance = np.linalg.norm(rgb - background, axis=2)
    spread = float(np.percentile(near, 95))
    return distance > max(MIN_CONTRAST, 2 * spread)


def _pieces(mask: np.ndarray) -> list[Polygon]:
    """The pieces of the mask as polygons in pixels, y downwards, largest
    first; pieces touching only at a corner are apart."""
    lows, lefts, rights = [], [], []
    padded = np.pad(mask.astype(np.int8), ((0, 0), (1, 1)))
    for row, line in enumerate(padded):
        edges = np.flatnonzero(np.diff(line))
        lows.extend([row] * (len(edges) // 2))
        lefts.extend(edges[0::2])
        rights.extend(edges[1::2])
    if not lows:
        return []
    top = np.asarray(lows, dtype=float)
    boxes = shapely.box(
        np.asarray(lefts, dtype=float), top, np.asarray(rights, dtype=float), top + 1
    )
    union = shapely.union_all(boxes)
    pieces = list(union.geoms) if isinstance(union, MultiPolygon) else [union]
    return sorted(pieces, key=lambda piece: (-piece.area, piece.bounds))


def _main_piece(mask: np.ndarray) -> Polygon:
    """The one subject, smoothed at the scale roads can draw, without holes,
    in pixels with y upwards."""
    height, width = mask.shape
    pieces = _pieces(mask)
    if not pieces or pieces[0].area < MIN_SUBJECT_PX:
        raise InvalidImageError(
            "no_subject", "no subject stands out from the background"
        )
    main = pieces[0]
    counted = sum(p.area for p in pieces if p.area >= SPECK_SHARE * main.area)
    if main.area < MAIN_SHARE * counted:
        raise InvalidImageError(
            "scattered",
            "the image shows more than one subject: it needs a single one",
        )
    left, top, right, bottom = main.bounds
    if left <= 0 or top <= 0 or right >= width or bottom >= height:
        raise InvalidImageError(
            "edge",
            "the subject touches the edge of the image: "
            "leave some background around it",
        )
    size = max(right - left, bottom - top)
    if size < MIN_SUBJECT_PX:
        raise InvalidImageError(
            "small",
            f"the subject is too small: {size:.0f} pixels across, "
            f"at least {MIN_SUBJECT_PX} needed",
        )
    radius = SMOOTH_SHARE * size
    filled = Polygon(main.exterior)
    # Opening drops thin parts, closing fills narrow gaps; mitred joins keep
    # the corners sharp.
    smooth = (
        filled.buffer(-radius, join_style="mitre")
        .buffer(2 * radius, join_style="mitre")
        .buffer(-radius, join_style="mitre")
    )
    parts = list(smooth.geoms) if isinstance(smooth, MultiPolygon) else [smooth]
    parts = [p for p in parts if not p.is_empty]
    if not parts:  # not seen: the subject is at least MIN_SUBJECT_PX wide
        raise InvalidImageError("no_subject", "the subject is only thin lines")
    best = max(parts, key=lambda p: (p.area, p.bounds))
    outside = Polygon(best.exterior)
    return affinity.scale(outside, yfact=-1, origin=(0, 0))


def _corners(polygon: Polygon) -> list[list[float]]:
    """The corners of the outline, closed, the first point repeated."""
    left, bottom, right, top = polygon.bounds
    size = max(right - left, top - bottom)
    simple = polygon.simplify(SIMPLIFY_SHARE * size, preserve_topology=True)
    points = [[round(x, 2), round(y, 2)] for x, y in simple.exterior.coords]
    if len(points) - 1 > MAX_POINTS:
        raise InvalidImageError(
            "jagged",
            f"the outline is too jagged to draw with roads: "
            f"{len(points) - 1} corners, at most {MAX_POINTS}",
        )
    return points
