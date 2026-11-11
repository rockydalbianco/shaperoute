import { render, screen } from "@testing-library/react-native";

import type { SnowPart } from "../activities/snowDay";
import { clockOf, runsRows, SkiRuns, STOP_MS } from "./SkiRuns";

// «Runs», the day one part at a time (TASK-429 part B): the lifts and the
// descents numbered as on the map, their times and metres, a long stop as
// a line between.

const NINE = new Date(2026, 11, 14, 9, 12).getTime();

function part(
  kind: SnowPart["kind"],
  n: number,
  startMs: number,
  minutes: number,
  heightM: number,
  topMps: number | null = null,
): SnowPart {
  return {
    kind,
    n,
    leg: { from: n * 10, to: n * 10 + 5 },
    startMs,
    endMs: startMs + minutes * 60_000,
    ms: minutes * 60_000,
    metres: 1000,
    heightM,
    topMps,
  };
}

const lift = part("lift", 1, NINE, 6, 620);
const descent = part("descent", 1, NINE + 7 * 60_000, 4, 618.6, 19);
// After 52 minutes at lunch.
const after = part("lift", 2, descent.endMs + 52 * 60_000, 9, 640);

const speedText = (mps: number) => `${(mps * 3.6).toFixed(1)} km/h`;

test("writes a moment of the day on the phone's clock", () => {
  expect(clockOf(NINE)).toBe("09:12");
});

test("a stop of STOP_MS or more is a line of its own; a shorter one is not", () => {
  expect(runsRows([lift, descent]).map((row) => row.kind)).toEqual(["part", "part"]);
  const rows = runsRows([lift, descent, after]);
  expect(rows.map((row) => row.kind)).toEqual(["part", "part", "stop", "part"]);
  expect(rows[2]).toMatchObject({ kind: "stop", minutes: 52 });
  expect(STOP_MS).toBe(10 * 60_000);
});

test("shows each part with its number, its time and its metres", async () => {
  await render(<SkiRuns parts={[lift, descent, after]} speedText={speedText} />);
  expect(screen.getByText("L1")).toBeOnTheScreen();
  expect(screen.getAllByText("Lift")).toHaveLength(2);
  expect(screen.getByText("09:12 · 6 min")).toBeOnTheScreen();
  expect(screen.getByText("+620 m")).toBeOnTheScreen();
  expect(screen.getByText("1")).toBeOnTheScreen();
  expect(screen.getByText("09:19 · 4 min")).toBeOnTheScreen();
  expect(screen.getByText("−619 m")).toBeOnTheScreen();
  expect(screen.getByText("68.4 km/h top")).toBeOnTheScreen();
  expect(screen.getByText("Stopped 52 min")).toBeOnTheScreen();
  expect(screen.getByText("L2")).toBeOnTheScreen();
});

test("a lift has no top speed", async () => {
  await render(<SkiRuns parts={[lift]} speedText={speedText} />);
  expect(screen.queryByText(/top$/)).toBeNull();
});

test("a saved day's parts have their names, a descent without one says so (part C)", async () => {
  const names = new Map([
    ["L1", "Ciampinoi"],
    ["1", null],
  ]);
  await render(
    <SkiRuns
      parts={[lift, descent]}
      speedText={speedText}
      nameOf={(each) =>
        names.get(each.kind === "lift" ? `L${each.n}` : `${each.n}`) ?? null
      }
    />,
  );
  expect(screen.getByText("Ciampinoi")).toBeOnTheScreen();
  expect(screen.queryByText("Lift")).toBeNull();
  expect(screen.getByText("Piste without a name")).toBeOnTheScreen();
  expect(screen.getByText("09:19 · 4 min")).toBeOnTheScreen();
});
