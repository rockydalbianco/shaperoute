"""A saved run says what it was (TASK-251, part B): `activity` in the list
and in the run opened whole, so the app writes a paddler's pace for an
outing on the water. A run saved by an app before TASK-208, which says no
activity, is a run."""

from typing import Any

from fastapi.testclient import TestClient
from test_activities import (
    KEY,
    OTHER_KEY,
    client,  # noqa: F401  (the fixtures of the activities' tests)
    database,  # noqa: F401
    request,
    service,  # noqa: F401
    signed_up,
    wall,  # noqa: F401
)

PADDLED: dict[str, Any] = {"activity": "paddling"}


def test_a_run_saved_on_the_water_is_listed_and_opened_as_paddled(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    body = request(**PADDLED, points=None, similarity=None, shape=None)
    assert client.put(f"/me/activities/{KEY}", json=body, headers=me).status_code == 201
    (listed,) = client.get("/me/activities", headers=me).json()["activities"]
    assert listed["activity"] == "paddling"
    whole = client.get(f"/me/activities/{KEY}", headers=me).json()
    assert whole["activity"] == "paddling"


def test_a_run_that_says_no_activity_is_a_run(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    body = {key: value for key, value in request().items() if key != "activity"}
    assert "activity" not in body
    assert (
        client.put(f"/me/activities/{OTHER_KEY}", json=body, headers=me).status_code
        == 201
    )
    (listed,) = client.get("/me/activities", headers=me).json()["activities"]
    assert listed["activity"] == "running"
    assert (
        client.get(f"/me/activities/{OTHER_KEY}", headers=me).json()["activity"]
        == "running"
    )
