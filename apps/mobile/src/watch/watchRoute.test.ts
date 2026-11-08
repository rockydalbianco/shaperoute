import { readFileSync, writeFileSync } from "fs";
import path from "path";

import type { Direction, LatLon, Walk } from "@shaperoute/shared-types";
import penUp from "@shaperoute/shared-types/fixtures/route-result-pen-up.json";
import swimming from "@shaperoute/shared-types/fixtures/route-result-swimming.json";

import { favoriteKey } from "../favorites/favoriteKey";
import levico from "../navigation/fixtures/levico-dead-end-u-turn.json";
import { simplifyDirections } from "../navigation/simplifyDirections";
import {
  decodeWatchRoute,
  MAX_WATCH_POINTS,
  type RouteToSend,
  routeToSendOf,
  watchRouteOf,
} from "./watchRoute";

const FILE = path.join(
  __dirname,
  "..",
  "..",
  "targets",
  "watch",
  "Core",
  "Fixtures",
  "routes.json",
);

/** The routes of the fixture: a run with its directions, a word by bike
 * with the pen up, a closed swim with none. */
function routes(): { name: string; send: RouteToSend }[] {
  const run = levico.points as LatLon[];
  const word = penUp.points as LatLon[];
  const swim = swimming.points as LatLon[];
  return [
    {
      name: "a run with its directions",
      send: {
        key: favoriteKey(run),
        title: "Levico",
        activity: "running",
        distanceM: 1015.1,
        points: run,
        directions: levico.directions as Direction[],
      },
    },
    {
      name: "a word by bike with the pen up",
      send: {
        key: favoriteKey(word),
        title: "IO",
        activity: "cycling",
        distanceM: penUp.distance_m,
        points: word,
        directions: [],
        walks: penUp.walks as Walk[],
        word: penUp.word,
      },
    },
    {
      name: "a closed swim without directions",
      send: {
        key: favoriteKey(swim),
        title: "Circle",
        activity: "swimming",
        distanceM: swimming.distance_m,
        points: swim,
        directions: [],
      },
    },
  ];
}

function fixtureJson(): string {
  const cases = routes().map(({ name, send }) => ({ name, route: watchRouteOf(send) }));
  return `${JSON.stringify({ routes: cases }, null, 2)}\n`;
}

describe("a route for the watch", () => {
  // scripts/watch-routes.sh sets it: the file is written again, then checked.
  if (process.env.WRITE_WATCH_ROUTES === "1") {
    writeFileSync(FILE, fixtureJson());
  }

  it("is the one of routes.json, which the watch's XCTest reads", () => {
    // When this fails, run apps/mobile/scripts/watch-routes.sh.
    expect(JSON.parse(readFileSync(FILE, "utf8"))).toEqual(JSON.parse(fixtureJson()));
  });

  it("has the directions as the run says them", () => {
    const [run] = routes();
    const route = watchRouteOf(run.send);
    const said = simplifyDirections(run.send.points, [...run.send.directions]);
    expect(route?.directions.map((d) => d.distance_m)).toEqual(
      said.map((d) => d.distance_m),
    );
    expect(route?.anywhere).toBe(false);
    expect(route?.announceM).toBe(50);
  });

  it("says what the phone decides: a ride, its walks, the turns further ahead", () => {
    const route = watchRouteOf(routes()[1].send);
    expect(route).toMatchObject({
      ride: true,
      paddle: false,
      walks: [[2, 5]],
      word: "IO",
      anywhere: false,
      announceM: 100,
    });
  });

  it("starts a closed swim wherever the swimmer reaches it", () => {
    expect(watchRouteOf(routes()[2].send)).toMatchObject({
      anywhere: true,
      ride: false,
    });
  });

  it("has its points to 6 decimals", () => {
    const route = watchRouteOf(routes()[0].send);
    for (const [lat, lon] of route?.points ?? []) {
      expect(Number(lat.toFixed(6))).toBe(lat);
      expect(Number(lon.toFixed(6))).toBe(lon);
    }
  });

  it("is not sent with fewer than two points or more than the watch keeps", () => {
    const base = routes()[0].send;
    expect(watchRouteOf({ ...base, points: base.points.slice(0, 1) })).toBeNull();
    const many: LatLon[] = Array.from({ length: MAX_WATCH_POINTS + 1 }, (_, i) => [
      46 + i * 1e-5,
      11,
    ]);
    expect(watchRouteOf({ ...base, points: many, directions: [] })).toBeNull();
  });

  it("drops walks that do not fit its points", () => {
    const base = routes()[1].send;
    expect(watchRouteOf({ ...base, walks: [[5, 2]] })?.walks).toEqual([]);
  });

  it("reads back what it writes, and refuses what the watch refuses", () => {
    for (const { send } of routes()) {
      const route = watchRouteOf(send);
      expect(decodeWatchRoute(JSON.parse(JSON.stringify(route)))).toEqual(route);
    }
    const route = watchRouteOf(routes()[0].send);
    expect(decodeWatchRoute({ ...route, points: [[46, 11]] })).toBeNull();
    expect(decodeWatchRoute({ ...route, key: "" })).toBeNull();
    expect(decodeWatchRoute({ ...route, walks: [[3, 1]] })).toBeNull();
    expect(
      decodeWatchRoute({
        ...route,
        directions: [{ ...route?.directions[0], turn: "jump" }],
      }),
    ).toBeNull();
    expect(
      decodeWatchRoute({
        ...route,
        points: [
          [91, 11],
          [46, 11],
        ],
      }),
    ).toBeNull();
  });

  it("is the route on the map as the heart keeps it", () => {
    const points = levico.points as LatLon[];
    const send = routeToSendOf(
      {
        id: "k1",
        request: {
          city: "",
          shape: null,
          word: "CIAO",
          style: null,
          title: null,
          distance_m: 1000,
          route_m: 1015.1,
          similarity: 0.9,
          points,
          activity: "cycling",
        },
      },
      [],
    );
    expect(send).toMatchObject({
      key: "k1",
      title: "CIAO",
      activity: "cycling",
      distanceM: 1015.1,
      word: "CIAO",
    });
  });
});
