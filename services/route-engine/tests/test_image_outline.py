"""The outline of the subject of an image (TASK-072). Every image is drawn
here with Pillow: no image files in the repository."""

import io
import json
import math
import random
from pathlib import Path

import pytest
from PIL import Image, ImageDraw
from shapely.geometry import Point as Disc
from shapely.geometry import Polygon

from route_engine.image_outline import (
    MAX_POINTS,
    InvalidImageError,
    outline_data,
    outline_from_image,
)
from route_engine.shapes.outline import read_outline

WIDTH, HEIGHT = 400, 300
Xy = tuple[float, float]


def _encode(image: Image.Image, kind: str = "PNG", **options: object) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, kind, **options)
    return buffer.getvalue()


def _canvas(
    size: tuple[int, int] = (WIDTH, HEIGHT), colour: str = "white"
) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", size, colour)
    return image, ImageDraw.Draw(image)


def _star(cx: float = 200, cy: float = 150, r: float = 120) -> list[Xy]:
    return [
        (
            cx + r * (1 if k % 2 == 0 else 0.45) * math.sin(k * math.pi / 5),
            cy - r * (1 if k % 2 == 0 else 0.45) * math.cos(k * math.pi / 5),
        )
        for k in range(10)
    ]


def _traced(data: dict[str, object]) -> Polygon:
    """The traced outline in image pixels, y downwards like the drawing."""
    points = data["points"]
    assert isinstance(points, list)
    return Polygon([(x, -y) for x, y in points])


def _overlap(a: Polygon, b: Polygon) -> float:
    return a.intersection(b).area / a.union(b).area


def _refusal(image: bytes) -> str:
    with pytest.raises(InvalidImageError) as info:
        outline_data(image)
    return info.value.reason


# --- Subjects that give an outline ---


def test_a_disc_gives_a_round_outline() -> None:
    image, draw = _canvas()
    draw.ellipse((100, 50, 300, 250), fill="black")
    data = outline_data(_encode(image), name="disc")
    assert data["name"] == "disc"
    assert _overlap(_traced(data), Disc(200, 150).buffer(100)) > 0.97
    assert 12 <= len(data["points"]) - 1 <= 40


def test_a_star_keeps_its_five_points_also_from_a_jpeg() -> None:
    image, draw = _canvas()
    draw.polygon(_star(), fill=(200, 30, 30))
    data = outline_data(_encode(image, "JPEG", quality=85))
    traced = _traced(data)
    assert _overlap(traced, Polygon(_star())) > 0.95
    tips = [(x, y) for x, y in _star()[0::2]]
    assert all(traced.exterior.distance(Disc(tip)) < 8 for tip in tips)


def test_a_notch_is_kept_in_the_outline() -> None:
    image, draw = _canvas()
    draw.rectangle((80, 60, 319, 239), fill="navy")
    draw.rectangle((170, 60, 229, 159), fill="white")  # open at the top
    notched = Polygon(
        [(80, 60), (170, 60), (170, 160), (230, 160), (230, 60), (320, 60),
         (320, 240), (80, 240)]
    )  # fmt: skip
    traced = _traced(outline_data(_encode(image)))
    assert _overlap(traced, notched) > 0.98
    assert traced.area < 0.9 * traced.convex_hull.area


def test_only_the_outside_line_is_kept() -> None:
    """A ring and a line drawing give the outside of the subject: the hole
    and the lines inside are left out."""
    image, draw = _canvas()
    draw.ellipse((100, 50, 300, 250), fill="black")
    draw.ellipse((150, 100, 250, 200), fill="white")
    ring = outline_data(_encode(image))
    image, draw = _canvas()
    draw.ellipse((100, 50, 300, 250), outline="black", width=3)
    draw.line((100, 150, 300, 150), fill="black", width=3)
    drawing = outline_data(_encode(image))
    for data in (ring, drawing):
        assert _overlap(_traced(data), Disc(200, 150).buffer(100)) > 0.97


def test_a_transparent_background_uses_the_transparency() -> None:
    """A white subject on a transparent background, as a logo is often
    saved: the colour alone would not tell it from white."""
    image = Image.new("RGBA", (300, 300), (0, 0, 0, 0))
    ImageDraw.Draw(image).ellipse((50, 50, 250, 250), fill=(255, 255, 255, 255))
    data = outline_data(_encode(image))
    assert _overlap(_traced(data), Disc(150, 150).buffer(100)) > 0.97


def test_a_coloured_background_and_a_few_specks_are_fine() -> None:
    image, draw = _canvas(colour="#e8d8b0")
    draw.ellipse((100, 50, 300, 250), fill="#303060")
    for x, y in ((30, 30), (360, 260), (40, 250)):
        draw.ellipse((x, y, x + 3, y + 3), fill="#303060")
    data = outline_data(_encode(image))
    assert _overlap(_traced(data), Disc(200, 150).buffer(100)) > 0.97


def test_thin_parts_are_dropped() -> None:
    """A hairline sticking out of the subject is thinner than roads can draw
    (ADR-0039): the outline leaves it out."""
    image, draw = _canvas()
    draw.ellipse((100, 50, 300, 250), fill="black")
    draw.line((300, 150, 380, 150), fill="black", width=2)
    traced = _traced(outline_data(_encode(image)))
    assert traced.bounds[2] < 310


def test_a_large_photo_is_reduced_and_a_rotated_one_turned_upright() -> None:
    """A phone saves a portrait photo on its side, with an EXIF tag that
    says how to turn it."""
    image, draw = _canvas(size=(2400, 1200))
    draw.ellipse((300, 300, 2100, 900), fill="black")  # wide
    exif = Image.Exif()
    exif[0x0112] = 6  # rotate 90° clockwise to show
    data = outline_data(_encode(image, "JPEG", exif=exif.tobytes()))
    left, top, right, bottom = _traced(data).bounds
    assert max(right, bottom) <= 640
    assert bottom - top > 2 * (right - left)  # tall, as shown


def test_the_same_image_gives_the_same_outline() -> None:
    image, draw = _canvas()
    draw.polygon(_star(), fill="black")
    raw = _encode(image, "JPEG")
    assert outline_data(raw) == outline_data(raw)


def test_the_saved_outline_reads_back_as_the_same_outline(tmp_path: Path) -> None:
    image, draw = _canvas()
    draw.polygon(_star(), fill="black")
    picture = tmp_path / "star.png"
    picture.write_bytes(_encode(image))
    outline = outline_from_image(picture, name="star", source=picture.name)
    saved = tmp_path / "star.json"
    saved.write_text(json.dumps(outline_data(picture, "star", picture.name)))
    assert read_outline(saved) == outline
    assert "star.png" in outline.source
    assert outline(64)[0] != outline(64)[1]


# --- Images refused, with the reason ---


def test_a_busy_background_is_refused() -> None:
    noise = random.Random(72)
    image = Image.new("RGB", (WIDTH, HEIGHT))
    image.putdata(
        [tuple(noise.randrange(256) for _ in range(3)) for _ in range(WIDTH * HEIGHT)]
    )
    ImageDraw.Draw(image).ellipse((100, 50, 300, 250), fill="black")
    assert _refusal(_encode(image)) == "background"


def test_an_empty_image_is_refused() -> None:
    image, _ = _canvas()
    assert _refusal(_encode(image)) == "no_subject"


def test_two_subjects_are_refused() -> None:
    image, draw = _canvas()
    draw.ellipse((20, 50, 150, 250), fill="black")
    draw.ellipse((250, 50, 380, 250), fill="black")
    assert _refusal(_encode(image)) == "scattered"


def test_a_subject_cut_by_the_edge_is_refused() -> None:
    image, draw = _canvas()
    draw.ellipse((-50, 50, 300, 250), fill="black")
    assert _refusal(_encode(image)) == "edge"


def test_a_tiny_subject_is_refused() -> None:
    image, draw = _canvas()
    draw.ellipse((190, 140, 220, 170), fill="black")
    assert _refusal(_encode(image)) == "small"


def test_a_jagged_outline_is_refused() -> None:
    """A gear with 45 teeth: each tooth a few percent of the subject, more
    corners than roads can follow."""
    teeth = []
    for k in range(180):
        angle = 2 * math.pi * k / 180
        r = 120 if (k // 2) % 2 else 100
        teeth.append((200 + r * math.cos(angle), 150 + 0.9 * r * math.sin(angle)))
    image, draw = _canvas()
    draw.polygon(teeth, fill="black")
    with pytest.raises(InvalidImageError, match=f"at most {MAX_POINTS}") as info:
        outline_data(_encode(image))
    assert info.value.reason == "jagged"


def test_other_formats_and_other_files_are_refused(tmp_path: Path) -> None:
    image, draw = _canvas()
    draw.ellipse((100, 50, 300, 250), fill="black")
    assert _refusal(_encode(image, "GIF")) == "format"
    assert _refusal(b"not an image") == "unreadable"
    with pytest.raises(InvalidImageError, match="cannot read the image"):
        outline_data(tmp_path / "missing.png")
