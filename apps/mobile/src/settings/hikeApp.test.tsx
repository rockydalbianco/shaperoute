/**
 * «Hike» ⛰️ in the app (TASK-377 part B, ADR-0321): its row in «Settings»,
 * on since the server hikes; offered in the search and the form to
 * publish; the caution under its routes in «Draw»; the files of
 * other apps that say a hike.
 */
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import type { RouteRequest, RouteResult } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";
import { readFileSync } from "fs";
import { join } from "path";

import { sportOfWord } from "../imports/fileTrack";
import { readFit } from "../imports/fit";
import { RouteOutcome } from "../route/RoutePanel";
import { withoutRouteIcon } from "../screens/RunNoRouteButton";
import { SEARCH_ACTIVITIES } from "../search/searchFilters";
import {
  activityOf,
  activityOffered,
  ALL_SPORTS,
  canChoose,
  runActivityOf,
  type SportOption,
  withoutRouteLabel,
} from "./sport";

jest.mock("expo-file-system");

const CAUTION =
  "Trails can be demanding: check the route and the weather before you set off.";

test("«Hike» ⛰️ comes after «Run», on foot, on since the server hikes", () => {
  const index = ALL_SPORTS.findIndex((option) => option.id === "hike");
  expect(ALL_SPORTS[index - 1]?.id).toBe("run");
  expect(ALL_SPORTS[index]).toEqual({
    id: "hike",
    emoji: "⛰️",
    name: "Hike",
    ready: true,
  });
  expect(canChoose("hike", ALL_SPORTS)).toBe(true);
  // Asked, and saved, as a hike, in its own words and sign.
  expect(activityOf("hike")).toBe("hiking");
  expect(runActivityOf("hike")).toBe("hiking");
  expect(withoutRouteLabel("hike")).toBe("Hike without a route");
  expect(withoutRouteIcon("hike")).toBe("⛰️");
});

test("a hike is offered to search and publish while «Hike» is ready", () => {
  expect(activityOffered("hiking")).toBe(true);
  expect(SEARCH_ACTIVITIES).toContain("hiking");
  const soon: SportOption[] = ALL_SPORTS.map((option) =>
    option.id === "hike" ? { ...option, ready: false } : option,
  );
  expect(activityOffered("hiking", soon)).toBe(false);
  // The walk keeps to its own row.
  expect(activityOffered("walking", soon)).toBe(true);
  expect(activityOffered("running", soon)).toBe(true);
});

const hikeHeart: RouteRequest = {
  start: [46.29, 11.46],
  shape: "heart",
  distance_m: 10000,
  activity: "hiking",
};

const route: RouteResult = {
  ...(jobDone.result as unknown as RouteResult),
  warnings: [],
};

function done(request: RouteRequest) {
  return (
    <RouteOutcome
      view={{ status: "done", request, result: route }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={jest.fn()}
      onPickShape={jest.fn()}
      onStart={jest.fn()}
      onSignal={jest.fn()}
    />
  );
}

test("a hike's route says its trails can be demanding; a walk's does not", async () => {
  const { rerender } = await render(done(hikeHeart));
  expect(screen.getByText(CAUTION)).toBeTruthy();
  await rerender(done({ ...hikeHeart, activity: "walking" }));
  expect(screen.queryByText(CAUTION)).toBeNull();
});

test("GPX's hiking, Strava's 4 and a FIT file's hiking are a hike", () => {
  expect(sportOfWord("hiking")).toBe("hiking");
  expect(sportOfWord("Hike")).toBe("hiking");
  expect(sportOfWord("4")).toBe("hiking");
  // The walk as before.
  expect(sportOfWord("walking")).toBe("walking");
  // The run of the Garmin watch (make_fixtures.mjs), its session's sport
  // made a hike: hiking (17). The session is the last message, 19 bytes,
  // before the 2 of the CRC; its sport is the ninth of them.
  const bytes = new Uint8Array(
    readFileSync(join(__dirname, "../../__tests__/fixtures/imports/garmin-run.fit")),
  );
  const sport = bytes.length - 2 - 19 + 9;
  expect(bytes[sport]).toBe(1);
  bytes[sport] = 17;
  bytes[sport + 1] = 0;
  expect(readFit(bytes).sport).toBe("hiking");
});
