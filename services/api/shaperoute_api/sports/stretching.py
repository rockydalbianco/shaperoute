"""A stretching session, saved without a track (TASK-475, ADR-0386, the
user's choices «Diventa uno sport» and «Sì, come la palestra» of
2026-11-12): its routine is stretch_sessions.py's. No shape, no personal
best, never sent to Strava, as a workout at the gym (strava_type kept for
the registry: "Yoga", technical value chosen by the agent)."""

from __future__ import annotations

from shaperoute_api.sports.base import ApiSport

SPORT = ApiSport(activity="stretching", strava_type="Yoga", trackless=True)
