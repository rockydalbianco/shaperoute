import { readFileSync, writeFileSync } from "fs";
import path from "path";

import { SPORT_PROFILES } from "../sports";
import {
  WATCH_SPORTS,
  WATCH_SPORTS_FILE,
  WATCH_SPORTS_VERSION,
  watchSportOf,
  watchSportsJson,
} from "./watchSports";

const FILE = path.join(__dirname, "..", "..", WATCH_SPORTS_FILE);

describe("the watch's sports", () => {
  // scripts/watch-sports.sh sets it: the file is written again, then checked.
  if (process.env.WRITE_WATCH_SPORTS === "1") {
    writeFileSync(FILE, watchSportsJson());
  }

  it("are the ones of sports.json, as the script writes it", () => {
    const text = readFileSync(FILE, "utf8");
    // When this fails, run apps/mobile/scripts/watch-sports.sh.
    expect(JSON.parse(text)).toEqual({
      version: WATCH_SPORTS_VERSION,
      sports: WATCH_SPORTS,
    });
    expect(text).toBe(watchSportsJson());
  });

  it("are every sport of the app, in its order", () => {
    expect(WATCH_SPORTS.map((sport) => sport.activity)).toEqual(
      SPORT_PROFILES.map((profile) => profile.activity),
    );
  });

  it("follow a route where the app draws one, and only record elsewhere", () => {
    const guided = WATCH_SPORTS.filter((sport) => sport.guided).map((s) => s.activity);
    expect(guided).toEqual(
      SPORT_PROFILES.filter((p) => p.drawKm !== undefined).map((p) => p.activity),
    );
    expect(guided).toContain("running");
    expect(guided).not.toContain("skiing");
    expect(guided).not.toContain("gym");
  });

  it("take the pace and the Apple workout of the registry", () => {
    const run = WATCH_SPORTS.find((sport) => sport.activity === "running");
    expect(run).toMatchObject({
      appleWorkout: 37,
      pace: "km",
      gps: true,
      onWatch: true,
    });
    const paddle = WATCH_SPORTS.find((sport) => sport.activity === "paddling");
    expect(paddle).toMatchObject({ pace: "paddle", onWater: true });
  });

  it("leave the GPS off at the gym and the swim off the watch", () => {
    const gym = WATCH_SPORTS.find((sport) => sport.activity === "gym");
    expect(gym).toMatchObject({ gps: false, guided: false, onWatch: true });
    const swim = WATCH_SPORTS.find((sport) => sport.activity === "swimming");
    expect(swim).toMatchObject({ pace: "swim", onWater: true, onWatch: false });
    // A flight is offered since TASK-305 part R4, for its heart rate, as
    // Apple's `.other`, outdoors, with no route to follow.
    const flight = WATCH_SPORTS.find((sport) => sport.activity === "paragliding");
    expect(flight).toMatchObject({
      appleWorkout: 3000,
      gps: true,
      guided: false,
      onWatch: true,
    });
    expect(WATCH_SPORTS.filter((sport) => !sport.gps).map((s) => s.activity)).toEqual([
      "gym",
    ]);
  });

  it("take a sport the table does not name as outdoors and offered", () => {
    const { pace: _pace, onWater: _onWater, ...plain } = SPORT_PROFILES[2];
    expect(watchSportOf({ ...plain, activity: "xc_skiing" })).toMatchObject({
      pace: "km",
      onWater: false,
      gps: true,
      onWatch: true,
    });
  });
});
