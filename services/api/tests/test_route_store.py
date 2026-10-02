"""RouteStore: a city's examples kept once drawn, and nothing else."""

from __future__ import annotations

import os
from dataclasses import replace
from pathlib import Path

from route_engine.directions import Direction
from route_engine.models import RouteRequest, RouteResult

from shaperoute_api.images import ImageRequest
from shaperoute_api.route_store import (
    CENTRES_FILE,
    KEEP_S,
    RouteStore,
    cell,
    engine_fingerprint,
)

ROVERETO = (45.8906, 11.0401)
HEART = RouteRequest(start=ROVERETO, shape="heart", distance_m=5000)
OTHER = RouteResult(
    points=[(45.8906, 11.0401), (45.8920, 11.0440), (45.8906, 11.0401)],
    distance_m=4900.0,
    similarity=0.8,
    shape="heart",
)
RESULT = RouteResult(
    points=[(45.8906, 11.0401), (45.8915, 11.0420), (45.8906, 11.0401)],
    distance_m=5100.0,
    similarity=0.9,
    shape="heart",
    warnings=["120 m of the route on steps"],
    directions=[
        Direction(
            node=42,
            point=(45.8906, 11.0401),
            distance_m=0.0,
            turn="depart",
            angle_deg=0.0,
            street="Corso Rosmini",
            road_type=None,
            branches=2,
            along="Via Dante",
        )
    ],
    alternatives=[OTHER],
)


class Clock:
    def __init__(self) -> None:
        self.now = 1_000_000.0

    def __call__(self) -> float:
        return self.now


def store(folder: Path, **options: object) -> RouteStore:
    options.setdefault("engine", "engine-a")
    return RouteStore(folder, **options)  # type: ignore[arg-type]


def test_a_route_from_a_city_centre_is_kept_and_read_whole(tmp_path: Path) -> None:
    kept = store(tmp_path)
    assert kept.get(HEART) is None
    kept.learn([ROVERETO])
    assert kept.put(HEART, RESULT) is True
    assert len(kept) == 1
    # Read as it was drawn: pairs, directions, the other routes to choose.
    assert kept.get(HEART) == RESULT
    # Also by an API started later.
    assert store(tmp_path).get(HEART) == RESULT


def test_the_same_square_of_ten_metres_is_the_same_start(tmp_path: Path) -> None:
    kept = store(tmp_path)
    kept.learn([(45.89061, 11.04012)])
    assert cell((45.89061, 11.04012)) == cell(ROVERETO) == "45.8906,11.0401"
    assert kept.put(HEART, RESULT) is True
    near = replace(HEART, start=(45.89063, 11.04008))
    assert kept.get(near) == RESULT
    assert kept.get(replace(HEART, start=(45.8916, 11.0401))) is None


def test_a_route_from_anywhere_else_is_never_written(tmp_path: Path) -> None:
    kept = store(tmp_path)
    kept.learn([ROVERETO])
    home = replace(HEART, start=(45.8871, 11.0362))
    assert kept.put(home, RESULT) is False
    assert kept.get(home) is None
    assert list(tmp_path.glob("*.json")) == []


def test_an_image_is_never_kept(tmp_path: Path) -> None:
    kept = store(tmp_path)
    kept.learn([ROVERETO])
    outline = [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 0.0)]
    image = ImageRequest(start=ROVERETO, outline=outline, distance_m=5000)
    assert kept.put(image, RESULT) is False
    assert kept.get(image) is None


def test_another_request_is_another_route(tmp_path: Path) -> None:
    kept = store(tmp_path)
    kept.learn([ROVERETO])
    kept.put(HEART, RESULT)
    assert kept.get(replace(HEART, shape="star")) is None
    assert kept.get(replace(HEART, distance_m=8000)) is None
    word = RouteRequest(start=ROVERETO, word="CIAO", distance_m=15000)
    assert kept.get(word) is None
    kept.put(word, replace(RESULT, shape=None, word="CIAO", alternatives=[]))
    assert kept.get(replace(word, style="block")) is None
    found = kept.get(word)
    assert found is not None and found.word == "CIAO"
    assert len(kept) == 2


def test_a_bike_route_is_kept_apart_from_the_run(tmp_path: Path) -> None:
    # TASK-190: the same shape from the same centre, by bike, is another
    # route, and the run keeps the file it had.
    kept = store(tmp_path)
    kept.learn([ROVERETO])
    run = replace(HEART, distance_m=10_000)
    ride = replace(run, activity="cycling")
    assert kept.put(run, RESULT)
    run_files = sorted(tmp_path.glob("*.json"))
    assert kept.get(ride) is None
    bike = replace(RESULT, distance_m=10_200.0, alternatives=[])
    assert kept.put(ride, bike)
    assert kept.get(ride) == bike
    assert kept.get(run) == RESULT
    assert len(kept) == 2
    assert set(run_files) < set(tmp_path.glob("*.json"))


def test_a_new_engine_draws_again(tmp_path: Path) -> None:
    old = store(tmp_path, engine="engine-a")
    old.learn([ROVERETO])
    old.put(HEART, RESULT)
    assert store(tmp_path, engine="engine-b").get(HEART) is None
    assert store(tmp_path, engine="engine-a").get(HEART) == RESULT


def test_the_engine_fingerprint_is_the_same_for_the_same_code() -> None:
    assert engine_fingerprint() == engine_fingerprint()
    assert len(engine_fingerprint()) == 12


def test_an_old_route_is_drawn_again(tmp_path: Path) -> None:
    clock = Clock()
    kept = store(tmp_path, clock=clock)
    kept.learn([ROVERETO])
    kept.put(HEART, RESULT)
    clock.now += KEEP_S - 1
    assert kept.get(HEART) == RESULT
    clock.now += 2
    assert kept.get(HEART) is None
    assert len(kept) == 0


def test_a_file_that_does_not_read_is_as_not_kept(tmp_path: Path) -> None:
    kept = store(tmp_path)
    kept.learn([ROVERETO])
    kept.put(HEART, RESULT)
    (path,) = tmp_path.glob("*.json")
    path.write_text('{"saved_at": 1000000.0, "result": {"points": [[45.89]]}}')
    assert kept.get(HEART) is None
    assert not path.exists()
    path.write_text("{half")
    assert kept.get(HEART) is None


def test_only_the_newest_routes_stay(tmp_path: Path) -> None:
    kept = store(tmp_path, max_routes=2)
    kept.learn([ROVERETO])
    for age, shape in enumerate(("heart", "circle", "star")):
        before = set(tmp_path.glob("*.json"))
        kept.put(replace(HEART, shape=shape), replace(RESULT, shape=shape))
        # Dates apart, whatever the grain of the disk's clock.
        (path,) = set(tmp_path.glob("*.json")) - before
        os.utime(path, (age + 1, age + 1))
    assert kept.get(HEART) is None
    assert kept.get(replace(HEART, shape="circle")) is not None
    assert kept.get(replace(HEART, shape="star")) is not None


def test_centres_are_remembered_by_the_next_api(tmp_path: Path) -> None:
    first = store(tmp_path)
    first.learn([ROVERETO, (46.0679, 11.1211)])
    first.learn([ROVERETO])
    assert (tmp_path / CENTRES_FILE).read_text().split() == [
        "45.8906,11.0401",
        "46.0679,11.1211",
    ]
    assert store(tmp_path).put(HEART, RESULT) is True


def test_the_oldest_centres_are_forgotten(tmp_path: Path) -> None:
    kept = store(tmp_path, max_centres=4)
    kept.learn([(45.0 + i / 100, 11.0) for i in range(5)])
    # Past the limit only the newest half is written again.
    assert (tmp_path / CENTRES_FILE).read_text().split() == [
        "45.0300,11.0000",
        "45.0400,11.0000",
    ]
    assert kept.put(replace(HEART, start=(45.04, 11.0)), RESULT) is True
    assert kept.put(replace(HEART, start=(45.0, 11.0)), RESULT) is False


def test_a_folder_that_cannot_be_written_keeps_nothing(tmp_path: Path) -> None:
    blocked = tmp_path / "file"
    blocked.write_text("not a folder")
    kept = store(blocked / "routes")
    kept.learn([ROVERETO])  # known until the API stops, not written
    assert kept.put(HEART, RESULT) is False
    assert kept.get(HEART) is None
