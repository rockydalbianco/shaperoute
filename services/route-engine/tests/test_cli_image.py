"""--image: a shape traced from an image (TASK-072)."""

import io
import json
from pathlib import Path

import pytest
from PIL import Image, ImageDraw
from test_cli import LEVICO, _GridSource

import route_engine.__main__ as cli
from route_engine.__main__ import OutlineRequest, main, parse_request
from route_engine.image_outline import outline_from_image
from route_engine.shapes.outline import read_outline


@pytest.fixture
def apple(tmp_path: Path) -> Path:
    image = Image.new("RGB", (300, 300), "white")
    draw = ImageDraw.Draw(image)
    draw.ellipse((50, 70, 250, 260), fill="#c02020")
    draw.polygon([(140, 80), (150, 30), (165, 30), (160, 80)], fill="#503010")
    path = tmp_path / "apple.png"
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    path.write_bytes(buffer.getvalue())
    return path


def _image_args(image: Path, **overrides: str) -> list[str]:
    values = {"image": str(image), "distance": "3000", "start": "46.0122,11.2986"}
    values.update(overrides)
    return [f"--{name}={value}" for name, value in values.items()]


def test_image_builds_an_outline_request_named_after_the_file(apple: Path) -> None:
    request = parse_request(_image_args(apple))
    assert isinstance(request, OutlineRequest)
    assert request.start == LEVICO
    assert request.shape == "apple"
    assert request.outline == outline_from_image(apple, "apple", "apple.png")


def test_the_traced_outline_is_saved_as_json(
    apple: Path, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    saved = tmp_path / "apple.json"
    assert main([*_image_args(apple), f"--save-outline={saved}"]) == 0
    printed = capsys.readouterr().out
    assert "apple (traced from" in printed
    assert f"Wrote {saved}" in printed
    assert read_outline(saved) == parse_request(_image_args(apple)).outline
    assert json.loads(saved.read_text(encoding="utf-8"))["name"] == "apple"


def test_save_outline_goes_with_image_only(
    capsys: pytest.CaptureFixture[str],
) -> None:
    argv = ["--shape=circle", "--distance=3000", "--start=46.0122,11.2986"]
    with pytest.raises(SystemExit) as exc_info:
        parse_request([*argv, "--save-outline=circle.json"])
    assert exc_info.value.code == 2
    assert "--save-outline needs --image" in capsys.readouterr().err


def test_an_existing_outline_file_is_never_overwritten(
    apple: Path, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    saved = tmp_path / "apple.json"
    saved.write_text("{}", encoding="utf-8")
    with pytest.raises(SystemExit):
        parse_request([*_image_args(apple), f"--save-outline={saved}"])
    assert "already exists" in capsys.readouterr().err
    assert saved.read_text(encoding="utf-8") == "{}"


def test_an_image_refused_exits_with_the_reason(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    blank = tmp_path / "blank.png"
    Image.new("RGB", (300, 300), "white").save(blank)
    with pytest.raises(SystemExit) as exc_info:
        parse_request(_image_args(blank))
    assert exc_info.value.code == 2
    err = capsys.readouterr().err
    assert "no subject stands out from the background" in err
    assert "Traceback" not in err


def test_image_writes_the_route_as_gpx(
    apple: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(cli, "OsmnxSource", _GridSource)
    out = tmp_path / "apple.gpx"
    assert main([*_image_args(apple), f"--out={out}"]) == 0
    assert "similarity:" in capsys.readouterr().out
    gpx = out.read_text(encoding="utf-8")
    assert "<name>apple 3 km" in gpx
    assert gpx.count("<trkpt") > 10
