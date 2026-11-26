"""The whole lines the API answers with: six decimals a coordinate
(TASK-501, O11).

PostgreSQL gives a line with every digit of its doubles, fifteen decimals;
six are about ten centimetres and weigh half as much on the way to the
phone. Only what the app is answered is shortened: the database keeps every
digit, and whatever is computed from a line (distances, scores, previews)
reads it whole, before.

Not a plain rounding. A line has a name, `best_routes.line_key`, the app's
`favoriteKey`: its points rounded to five decimals. Rounding to six first
and to five then moves a coordinate out of its cell about once in twenty
(46.0671249 → 46.067125 → 46.06713 instead of 46.06712), so nearly every
line would change name on the phone: a favorite run again would no longer
count for its route, a route already kept would show as not kept. So a
coordinate that the plain rounding would move to another cell takes the
sixth decimal beside it, one millionth of a degree away: the line the app
receives has the name of the line the database keeps.

The lists' previews are not touched: five decimals already
(`recommended.preview`).
"""

from __future__ import annotations

from collections.abc import Iterable

from route_engine.geo import LatLon

from shaperoute_api.best_routes import _js_round

DECIMALS = 6
_STEP = 10.0**-DECIMALS


def short(value: float) -> float:
    """`value` with six decimals, in the cell of five decimals `line_key`
    puts it in; `value` itself if none of the three nearest is there, which
    no coordinate on Earth does."""
    cell = _js_round(value * 1e5)
    plain = round(value, DECIMALS)
    if _js_round(plain * 1e5) == cell:
        return plain
    for beside in (round(plain - _STEP, DECIMALS), round(plain + _STEP, DECIMALS)):
        if _js_round(beside * 1e5) == cell:
            return beside
    return value


def short_point(point: LatLon) -> LatLon:
    lat, lon = point
    return short(lat), short(lon)


def short_line(points: Iterable[LatLon]) -> list[LatLon]:
    """`points` as the app is answered them: as many, in order, each
    coordinate `short`."""
    return [(short(lat), short(lon)) for lat, lon in points]
