import type { Direction } from "@shaperoute/shared-types";
import result from "@shaperoute/shared-types/fixtures/route-result.json";

import {
  announcement,
  distanceLabel,
  instruction,
  onto,
  roundMetres,
  thenText,
} from "./phrases";

const directions = result.directions as Direction[];

test("the shared example reads as instructions", () => {
  expect(directions.map(instruction)).toEqual([
    "Head out on Via Belenzani",
    "Turn left onto Via Manci",
    "Turn left onto the footpath",
    "Continue straight onto SP12",
    "Turn sharp right onto Via Verdi",
  ]);
});

test("a road with no name is called by its kind, never named", () => {
  const unnamed = { ...directions[2], road_type: "footway / steps" };
  expect(onto(unnamed)).toBe(" onto the footpath");
  expect(onto({ ...unnamed, road_type: "tertiary" })).toBe(" onto the road");
  expect(onto({ ...unnamed, road_type: null })).toBe("");
});

test("joined directions are said together, street names untouched", () => {
  expect(announcement(directions.slice(3), 47)).toBe(
    "In 50 metres, continue straight onto SP12, then turn sharp right onto Via Verdi",
  );
  expect(thenText(directions.slice(4))).toBe("Then turn sharp right onto Via Verdi");
  expect(announcement(directions.slice(1, 2), null)).toBe("Turn left onto Via Manci");
});

test("distances as a runner hears and reads them", () => {
  expect(roundMetres(3)).toBe(10);
  expect(roundMetres(44)).toBe(40);
  expect(distanceLabel(126)).toBe("130 m");
  expect(distanceLabel(1440)).toBe("1.4 km");
});
