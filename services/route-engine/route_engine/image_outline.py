"""The outline of the subject of an image (TASK-072), or of its few
subjects joined in one line (TASK-084).

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
   must keep off the border.
4. Its outside line is smoothed at the scale roads can draw: parts thinner
   than 2 × SMOOTH_SHARE of the drawing are dropped, and gaps as narrow are
   closed (ADR-0039: thin details do not survive on roads). Then it is
   simplified to its corners, which must be at most MAX_POINTS.
5. The other pieces are more subjects, at most MAX_SUBJECTS in all
   (ADR-0079): each is smoothed and simplified like the largest, at the
   scale of the whole drawing, and hung on what is already drawn as a
   stroke of an outline file (outline.py), nearest first. The stem of the
   stroke is the shortest stretch between the two, which the route runs out
   and back and which crosses no line; the loop at its end is the subject.
   Left out: a piece inside another, one cut by the border, one that
   smoothing wears away. Subjects too close to stay apart become one.

The result goes through parse_outline, the check every outline file passes.
It lives outside `shapes/`, which reads outlines with the standard library
only: tracing one needs Pillow, numpy and shapely.
"""

from __future__ import annotations

import io
import math
from pathlib import Path

import numpy as np
import shapely
from PIL import Image, ImageOps
from shapely import affinity
from shapely.geometry import LinearRing, LineString, MultiPolygon, Polygon
from shapely.ops import nearest_points

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
# The subjects of one image, the largest included (ADR-0079).
MAX_SUBJECTS = 4
# The largest subject's longer side, in analysed pixels.
MIN_SUBJECT_PX = 48
# Parts thinner than twice this share of the drawing's longer side are
# dropped, and gaps as narrow closed. The drawing is all its subjects.
SMOOTH_SHARE = 0.01
# The outline keeps the corners this far from the straight line, as a
# share of the drawing's longer side.
SIMPLIFY_SHARE = 0.01
MAX_POINTS = 100
# The points of the strokes of all the other subjects together.
MAX_SUBJECT_POINTS = 150
# Subjects nearer than this share of the drawing's longer side become one:
# simplified, their lines could touch.
JOIN_SHARE = 0.025
# The point where a subject is joined is its corner, when this near one
# (analysed pixels).
_CORNER_PX = 0.5
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
    shapes = _subjects(subject)
    size = _size(shapes)
    rings = [_corners(shape, size) for shape in shapes]
    if len(rings[0]) - 1 > MAX_POINTS:
        raise InvalidImageError(
            "jagged",
            f"the outline is too jagged to draw with roads: "
            f"{len(rings[0]) - 1} corners, at most {MAX_POINTS}",
        )
    data: dict[str, object] = {
        "name": name,
        "source": f"outline traced from {source} (TASK-072)",
        "license": "as the image",
        "points": rings[0],
    }
    if len(rings) > 1:
        strokes = _hung(rings)
        stroke_points = sum(len(stroke) for stroke in strokes)
        if stroke_points > MAX_SUBJECT_POINTS:
            raise InvalidImageError(
                "jagged",
                f"the other subjects are too jagged to draw with roads: "
                f"{stroke_points} points, at most {MAX_SUBJECT_POINTS}",
            )
        data["strokes"] = strokes
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


def _subjects(mask: np.ndarray) -> list[Polygon]:
    """The subjects, largest first, each smoothed at the scale roads can
    draw, without holes, in pixels with y upwards."""
    height, width = mask.shape
    pieces = _pieces(mask)
    if not pieces or pieces[0].area < MIN_SUBJECT_PX:
        raise InvalidImageError(
            "no_subject", "no subject stands out from the background"
        )
    main = pieces[0]

    def on_edge(piece: Polygon) -> bool:
        left, top, right, bottom = piece.bounds
        return left <= 0 or top <= 0 or right >= width or bottom >= height

    if on_edge(main):
        raise InvalidImageError(
            "edge",
            "the subject touches the edge of the image: "
            "leave some background around it",
        )
    left, top, right, bottom = main.bounds
    if max(right - left, bottom - top) < MIN_SUBJECT_PX:
        raise InvalidImageError(
            "small",
            f"the subject is too small: {max(right - left, bottom - top):.0f} "
            f"pixels across, at least {MIN_SUBJECT_PX} needed",
        )
    filled = [Polygon(main.exterior)]
    for piece in pieces[1:]:
        if piece.area < SPECK_SHARE * main.area:
            break  # largest first: the rest are specks
        # Cut by the border it is not a subject that can be drawn; inside
        # another it is one of its inner lines.
        if not on_edge(piece) and not any(f.contains(piece) for f in filled):
            filled.append(Polygon(piece.exterior))
    size = _size(filled)
    radius = SMOOTH_SHARE * size
    shapes = [_smooth(piece, radius) for piece in filled]
    if shapes[0] is None:  # not seen: the subject is at least MIN_SUBJECT_PX wide
        raise InvalidImageError("no_subject", "the subject is only thin lines")
    kept = _apart([shape for shape in shapes if shape is not None], JOIN_SHARE * size)
    if len(kept) > MAX_SUBJECTS:
        raise InvalidImageError(
            "scattered",
            f"the image shows {len(kept)} subjects: at most {MAX_SUBJECTS} "
            f"can be drawn in one line",
        )
    return [affinity.scale(shape, yfact=-1, origin=(0, 0)) for shape in kept]


def _size(shapes: list[Polygon]) -> float:
    """The longer side of the drawing: all the subjects together."""
    left, low, right, high = shapely.total_bounds(shapes)
    return float(max(right - left, high - low))


def _smooth(filled: Polygon, radius: float) -> Polygon | None:
    """The piece without parts thinner than twice `radius`, and with gaps as
    narrow closed; None when nothing is left of it."""
    # Opening drops thin parts, closing fills narrow gaps; mitred joins keep
    # the corners sharp.
    smooth = (
        filled.buffer(-radius, join_style="mitre")
        .buffer(2 * radius, join_style="mitre")
        .buffer(-radius, join_style="mitre")
    )
    parts = list(smooth.geoms) if isinstance(smooth, MultiPolygon) else [smooth]
    parts = [p for p in parts if not p.is_empty]
    if not parts:
        return None
    best = max(parts, key=lambda p: (p.area, p.bounds))
    return Polygon(best.exterior)


def _apart(shapes: list[Polygon], gap: float) -> list[Polygon]:
    """The subjects, those nearer than `gap` to each other made one, largest
    first. Subjects already apart are returned as they are."""
    near = any(
        a.distance(b) < gap for i, a in enumerate(shapes) for b in shapes[i + 1 :]
    )
    if not near:
        return shapes
    grown = shapely.union_all([s.buffer(gap / 2, join_style="mitre") for s in shapes])
    joined = grown.buffer(-gap / 2, join_style="mitre")
    parts = list(joined.geoms) if isinstance(joined, MultiPolygon) else [joined]
    whole = [Polygon(p.exterior) for p in parts if not p.is_empty]
    return sorted(whole, key=lambda p: (-p.area, p.bounds))


def _corners(polygon: Polygon, size: float) -> list[list[float]]:
    """The corners of a subject, closed, the first point repeated; `size` is
    the longer side of the drawing."""
    simple = polygon.simplify(SIMPLIFY_SHARE * size, preserve_topology=True)
    return [[round(x, 2), round(y, 2)] for x, y in simple.exterior.coords]


def _hung(rings: list[list[list[float]]]) -> list[list[list[float]]]:
    """The subjects after the first as strokes: each hung on what is drawn
    before it, the nearest first, by the shortest stretch between the two.
    No subject is nearer than the one joined, so the stretch crosses none."""
    drawn: list[LineString] = [LinearRing(rings[0])]
    left = [LinearRing(ring) for ring in rings[1:]]
    strokes: list[list[list[float]]] = []
    while left:
        hosts = shapely.union_all(drawn)
        nearest = min(range(len(left)), key=lambda i: (hosts.distance(left[i]), i))
        ring = left.pop(nearest)
        start, end = nearest_points(hosts, ring)
        loop = _from(ring, (end.x, end.y))
        stroke = [[round(start.x, 2), round(start.y, 2)], *loop]
        strokes.append(stroke)
        drawn.append(LineString(stroke))
    return strokes


def _from(ring: LinearRing, point: tuple[float, float]) -> list[list[float]]:
    """The closed line of `ring` starting and ending at `point`, which lies
    on it: at its corner when near one, as a new corner otherwise."""
    corners = [[x, y] for x, y in ring.coords][:-1]
    n = len(corners)
    at = min(range(n), key=lambda i: math.dist(corners[i], point))
    if math.dist(corners[at], point) > _CORNER_PX:
        side = min(
            range(n),
            key=lambda i: LineString([corners[i], corners[(i + 1) % n]]).distance(
                shapely.Point(point)
            ),
        )
        at = side + 1
        corners.insert(at, [round(point[0], 2), round(point[1], 2)])
    turned = corners[at:] + corners[:at]
    return [*turned, turned[0]]
