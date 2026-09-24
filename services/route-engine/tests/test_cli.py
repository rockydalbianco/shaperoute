from pathlib import Path

import networkx as nx
import pytest

import route_engine.__main__ as cli
from route_engine.__main__ import OutlineRequest, main, parse_request
from route_engine.geo import local_to_latlon
from route_engine.models import RouteRequest
from route_engine.shapes import OUTLINES


def _args(**overrides: str) -> list[str]:
    values = {"shape": "circle", "distance": "5000", "start": "46.0122,11.2986"}
    values.update(overrides)
    argv: list[str] = []
    for name, value in values.items():
        argv.append(f"--{name}={value}")
    return argv


def test_valid_arguments_build_expected_request() -> None:
    assert parse_request(_args()) == RouteRequest(
        start=(46.0122, 11.2986),
        shape="circle",
        distance_m=5000,
        activity="running",
    )


def test_main_prints_interpreted_request(capsys: pytest.CaptureFixture[str]) -> None:
    assert main(_args()) == 0
    out = capsys.readouterr().out
    assert "circle" in out
    assert "5000 m" in out
    assert "46.0122, 11.2986" in out


def test_boundary_coordinates_are_accepted() -> None:
    request = parse_request(_args(start="-90,180"))
    assert request.start == (-90.0, 180.0)


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"start": "91,11"}, "latitude must be between -90 and 90"),
        ({"start": "46,-181"}, "longitude must be between -180 and 180"),
        ({"start": "nan,11"}, "latitude must be between -90 and 90"),
        ({"start": "46.0122"}, "expected LAT,LON"),
        ({"start": "abc,11"}, "LAT and LON must be numbers"),
        ({"distance": "0"}, "distance must be between"),
        ({"distance": "-5000"}, "distance must be between"),
        ({"distance": "500000"}, "distance must be between"),
        ({"distance": "5km"}, "invalid int value"),
        ({"shape": "triangle"}, "unknown shape 'triangle'"),
        ({"activity": "swimming"}, "unsupported activity 'swimming'"),
    ],
)
def test_invalid_arguments_exit_with_readable_error(
    overrides: dict[str, str],
    message: str,
    capsys: pytest.CaptureFixture[str],
) -> None:
    with pytest.raises(SystemExit) as exc_info:
        parse_request(_args(**overrides))
    assert exc_info.value.code == 2
    err = capsys.readouterr().err
    assert message in err
    assert "Traceback" not in err


# --- --outline: a shape read from a file (TASK-032) ---

LEVICO = (46.0122, 11.2986)


def _outline_args(**overrides: str) -> list[str]:
    values = {
        "outline": str(OUTLINES / "house.json"),
        "distance": "3000",
        "start": "46.0122,11.2986",
    }
    values.update(overrides)
    return [f"--{name}={value}" for name, value in values.items()]


def test_outline_builds_a_request_with_the_outline_name() -> None:
    request = parse_request(_outline_args())
    assert isinstance(request, OutlineRequest)
    assert request.shape == "house"
    assert request.distance_m == 3000
    assert request.start == LEVICO


@pytest.mark.parametrize(
    ("argv", "message"),
    [
        (
            [*_args(), f"--outline={OUTLINES / 'star.json'}"],
            "not allowed with argument",
        ),
        (["--distance=5000", "--start=46.0122,11.2986"], "one of the arguments"),
        (_outline_args(outline="missing.json"), "cannot read the file"),
        (_outline_args(distance="0"), "distance must be between"),
    ],
)
def test_outline_errors_exit_with_readable_error(
    argv: list[str], message: str, capsys: pytest.CaptureFixture[str]
) -> None:
    with pytest.raises(SystemExit) as exc_info:
        parse_request(argv)
    assert exc_info.value.code == 2
    err = capsys.readouterr().err
    assert message in err
    assert "Traceback" not in err


def _grid(spacing_m: float = 50.0, half_m: float = 2000.0) -> nx.MultiDiGraph:
    """Streets every 50 m around LEVICO, both directions."""
    graph = nx.MultiDiGraph()
    n = int(half_m / spacing_m)
    for i in range(-n, n + 1):
        for j in range(-n, n + 1):
            lat, lon = local_to_latlon(LEVICO, i * spacing_m, j * spacing_m)
            graph.add_node((i, j), y=lat, x=lon)
    for i, j in list(graph.nodes):
        for b in ((i + 1, j), (i, j + 1)):
            if b in graph:
                graph.add_edge((i, j), b, length=spacing_m)
                graph.add_edge(b, (i, j), length=spacing_m)
    return graph


class _GridSource:
    def __init__(self, cache_dir: Path) -> None:
        self.graph = _grid()

    def is_cached(self, bbox: tuple[float, float, float, float]) -> bool:
        return True

    def load(self, bbox: tuple[float, float, float, float]) -> nx.MultiDiGraph:
        return self.graph


def test_outline_writes_the_route_as_gpx(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(cli, "OsmnxSource", _GridSource)
    out = tmp_path / "house.gpx"
    assert main([*_outline_args(), f"--out={out}"]) == 0
    printed = capsys.readouterr().out
    assert "house (outline from" in printed
    assert "drawn for ShapeRoute" in printed
    assert "similarity:" in printed
    gpx = out.read_text(encoding="utf-8")
    assert "<name>house 3 km" in gpx
    assert gpx.count("<trkpt") > 10
