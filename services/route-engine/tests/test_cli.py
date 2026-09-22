import pytest

from route_engine.__main__ import main, parse_request
from route_engine.models import RouteRequest


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
