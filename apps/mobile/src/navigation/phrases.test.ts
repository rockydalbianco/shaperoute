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
    "Turn left onto the footpath beside Via Rosmini",
    "Continue straight onto SP12",
    "Turn sharp right onto Via Verdi",
  ]);
});

test("a road with no name is called by its kind, never named", () => {
  const unnamed = { ...directions[2], road_type: "footway / steps", along: null };
  expect(onto(unnamed)).toBe(" onto the footpath");
  expect(onto({ ...unnamed, road_type: "tertiary" })).toBe(" onto the road");
  expect(onto({ ...unnamed, road_type: null })).toBe("");
});

test("the street beside an unnamed road is said as beside, never as its name", () => {
  const footway = directions[2];
  expect(footway.along).toBe("Via Rosmini");
  expect(onto(footway)).toBe(" onto the footpath beside Via Rosmini");
  expect(onto({ ...footway, road_type: null })).toBe(" beside Via Rosmini");
  expect(instruction({ ...footway, turn: "depart" })).toBe(
    "Head out on the footpath beside Via Rosmini",
  );
  expect(instruction({ ...footway, turn: "depart", road_type: null })).toBe(
    "Head out beside Via Rosmini",
  );
  expect(announcement([footway], 52)).toBe(
    "In 50 metres, turn left onto the footpath beside Via Rosmini",
  );
});

test("a street name always wins over the street beside", () => {
  const named = { ...directions[2], street: "Via Grazioli" };
  expect(instruction(named)).toBe("Turn left onto Via Grazioli");
});

test("an API older than TASK-060, without along, reads as before", () => {
  const { along: _along, ...old } = directions[2];
  expect(instruction(old)).toBe("Turn left onto the footpath");
  expect(instruction({ ...directions[2], along: "" })).toBe(
    "Turn left onto the footpath",
  );
  expect(instruction({ ...old, road_type: null })).toBe("Turn left");
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
