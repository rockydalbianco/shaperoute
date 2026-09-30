import re
from pathlib import Path

import networkx as nx
import numpy as np
import pytest

import route_engine.__main__ as cli
from route_engine.__main__ import main
from route_engine.export_gpx import to_gpx
from route_engine.geo import local_to_latlon
from route_engine.track_score import (
    MAX_ACCURACY_M,
    TrackNotScorableError,
    TrackPoint,
    clean_track,
    read_gpx_track,
    score_track,
)

LEVICO = (46.0122, 11.2986)
SIMILARITY = 0.88


def _square(side_m: float = 1000.0, step_m: float = 20.0) -> list[tuple[float, float]]:
    """A closed square route from LEVICO, a point every `step_m`."""
    n = int(side_m / step_m)
    xy = (
        [(i * step_m, 0.0) for i in range(n)]
        + [(side_m, i * step_m) for i in range(n)]
        + [(side_m - i * step_m, side_m) for i in range(n)]
        + [(0.0, side_m - i * step_m) for i in range(n)]
        + [(0.0, 0.0)]
    )
    return [local_to_latlon(LEVICO, x, y) for x, y in xy]


def _track(points: list[tuple[float, float]]) -> list[TrackPoint]:
    """`points` run at 20 m every 8 s, 2.5 m/s."""
    return [TrackPoint(lat, lon, time_s=8.0 * i) for i, (lat, lon) in enumerate(points)]


def _moved(points: list[tuple[float, float]], east_m: float, north_m: float) -> list:
    return [local_to_latlon((lat, lon), east_m, north_m) for lat, lon in points]


def test_the_planned_route_run_exactly_scores_what_the_route_scored() -> None:
    route = _square()
    scored = score_track(_track(route), route, SIMILARITY)
    assert scored.score == round(SIMILARITY * 100)
    assert scored.fidelity == pytest.approx(1.0)
    assert scored.covered == pytest.approx(1.0)
    assert scored.distance_m == pytest.approx(4000.0, rel=1e-3)


def test_ten_metres_of_gps_noise_cost_at_most_five_points() -> None:
    route = _square()
    noise = np.random.default_rng(111).normal(0.0, 10.0, size=(len(route), 2))
    noisy = [
        local_to_latlon(point, east, north)
        for point, (east, north) in zip(route, noise, strict=True)
    ]
    # No times: 10 m of noise every 20 m is not a run at a steady pace.
    track = [TrackPoint(lat, lon) for lat, lon in noisy]
    exact = score_track(_track(route), route, SIMILARITY).score
    assert exact - 5 <= score_track(track, route, SIMILARITY).score <= exact


def test_half_the_route_covers_half_and_scores_less() -> None:
    route = _square()
    half = score_track(_track(route[: len(route) // 2]), route, SIMILARITY)
    assert half.covered == pytest.approx(0.5, abs=0.03)
    assert half.on_route == pytest.approx(1.0)
    assert half.score < round(SIMILARITY * 100) - 20


def test_a_detour_lowers_the_score_without_lowering_the_cover() -> None:
    route = _square()
    away = [local_to_latlon(LEVICO, -20.0 * i, -20.0 * i) for i in range(1, 40)]
    detour = score_track(_track(away[::-1] + route), route, SIMILARITY)
    assert detour.covered == pytest.approx(1.0)
    assert detour.on_route < 0.85
    assert detour.score < round(SIMILARITY * 100)


def test_a_track_somewhere_else_scores_zero() -> None:
    route = _square()
    elsewhere = _moved(route, 5000.0, 5000.0)
    scored = score_track(_track(elsewhere), route, SIMILARITY)
    assert scored.score == 0
    assert scored.covered == 0.0


def test_the_parallel_street_is_not_the_route() -> None:
    route = _square()
    beside = score_track(_track(_moved(route, 60.0, 60.0)), route, SIMILARITY)
    assert beside.score < round(SIMILARITY * 100) / 2


@pytest.mark.parametrize(
    ("track", "reason"),
    [
        ([], "0 usable positions"),
        ([TrackPoint(*LEVICO)], "1 usable positions"),
        (_track(_square()[:10]), "less than 10%"),
    ],
)
def test_an_empty_or_too_short_track_has_no_score(
    track: list[TrackPoint], reason: str
) -> None:
    with pytest.raises(TrackNotScorableError, match=reason):
        score_track(track, _square(), SIMILARITY)


def test_a_route_without_a_line_cannot_score_a_track() -> None:
    with pytest.raises(TrackNotScorableError, match="planned route"):
        score_track(_track(_square()), [LEVICO], SIMILARITY)


def test_cleaning_drops_uncertain_repeated_and_impossible_positions() -> None:
    a = TrackPoint(*LEVICO, time_s=0.0, accuracy_m=5.0)
    b = TrackPoint(*local_to_latlon(LEVICO, 20.0, 0.0), time_s=8.0, accuracy_m=5.0)
    c = TrackPoint(*local_to_latlon(LEVICO, 40.0, 0.0), time_s=16.0, accuracy_m=5.0)
    uncertain = TrackPoint(
        *local_to_latlon(LEVICO, 30.0, 0.0), time_s=10.0, accuracy_m=MAX_ACCURACY_M + 1
    )
    repeated = TrackPoint(b.lat, b.lon, time_s=9.0, accuracy_m=5.0)
    jump = TrackPoint(*local_to_latlon(LEVICO, 20.0, 900.0), time_s=12.0)
    not_a_number = TrackPoint(float("nan"), LEVICO[1], time_s=13.0)
    track = [a, b, uncertain, repeated, jump, not_a_number, c]
    assert clean_track(track) == [a, b, c]


def test_a_gps_jump_does_not_change_the_score() -> None:
    route = _square()
    track = _track(route)
    lat, lon = local_to_latlon(LEVICO, 3000.0, 3000.0)
    track.insert(50, TrackPoint(lat, lon, time_s=8.0 * 49 + 4.0))
    assert score_track(track, route, SIMILARITY) == score_track(
        _track(route), route, SIMILARITY
    )


def test_a_gpx_track_is_read_with_its_times() -> None:
    gpx = """<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
 <trk><trkseg>
  <trkpt lat="46.0122" lon="11.2986"><time>2026-09-30T08:00:00Z</time></trkpt>
  <trkpt lat="46.0123" lon="11.2987"><time>2026-09-30T08:00:05Z</time></trkpt>
  <trkpt lat="46.0124" lon="11.2988"/>
 </trkseg></trk>
</gpx>"""
    assert read_gpx_track(gpx) == [
        TrackPoint(46.0122, 11.2986, 0.0),
        TrackPoint(46.0123, 11.2987, 5.0),
        TrackPoint(46.0124, 11.2988, None),
    ]


@pytest.mark.parametrize(
    "text",
    ["not xml at all", '<gpx><trk><trkseg><trkpt lat="x"/></trkseg></trk></gpx>'],
)
def test_a_file_that_is_not_a_gpx_track_says_so(text: str) -> None:
    with pytest.raises(TrackNotScorableError):
        read_gpx_track(text)


# --- --score-track: the CLI scores a recorded run ---


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


REQUEST = ["--shape=circle", "--distance=5000", "--start=46.0122,11.2986"]


def test_the_cli_scores_the_planned_route_as_the_route(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(cli, "OsmnxSource", _GridSource)
    run = tmp_path / "run.gpx"
    assert main([*REQUEST, f"--out={run}"]) == 0
    capsys.readouterr()

    assert main([*REQUEST, f"--score-track={run}"]) == 0
    printed = capsys.readouterr().out
    similarity = re.search(r"similarity: (\d\.\d\d)", printed)
    score = re.search(r"Track score: (\d+) out of 100", printed)
    assert similarity and score
    assert int(score.group(1)) == round(float(similarity.group(1)) * 100)
    assert "100% of the route run" in printed
    assert "Wrote" not in printed


def test_the_cli_says_why_a_track_has_no_score(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(cli, "OsmnxSource", _GridSource)
    run = tmp_path / "short.gpx"
    when = cli.datetime.now(cli.UTC)
    run.write_text(to_gpx(_square()[:3], "short", when), encoding="utf-8")
    assert main([*REQUEST, f"--score-track={run}"]) == 1
    assert "No score: the track is" in capsys.readouterr().err


def test_the_cli_refuses_a_track_file_it_cannot_read(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    with pytest.raises(SystemExit) as exit_info:
        main([*REQUEST, f"--score-track={tmp_path / 'missing.gpx'}"])
    assert exit_info.value.code == 2
    assert "missing.gpx" in capsys.readouterr().err
