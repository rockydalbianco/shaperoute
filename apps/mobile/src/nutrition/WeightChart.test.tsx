import { fireEvent, render, screen } from "@testing-library/react-native";

import { chartPoints, segmentOf, WeightChart } from "./WeightChart";
import { periodDays } from "./weightPeriod";
import { shortDay, signedPercent, signedWeight } from "./weightText";

jest.mock("../ui/useReduceMotion", () => ({ useReduceMotion: () => true }));

const HIDDEN = { includeHiddenElements: true } as const;

test("the points spread by when across and by how much up", () => {
  expect(
    chartPoints([
      { at: 0, value: 82 },
      { at: 7, value: 80 },
      { at: 28, value: 81 },
    ]),
  ).toEqual([
    { x: 0, y: 1 },
    { x: 0.25, y: 0 },
    { x: 1, y: 0.5 },
  ]);
  expect(chartPoints([{ at: 3, value: 80 }])).toEqual([{ x: 0.5, y: 0.5 }]);
  expect(chartPoints([])).toEqual([]);
});

test("a piece of the line is a bar between two points, turned", () => {
  const flat = segmentOf({ x: 0, y: 0.5 }, { x: 1, y: 0.5 }, 200, 100, 4);
  expect(flat).toEqual({ left: 0, top: 48, length: 200, angle: 0 });
  const down = segmentOf({ x: 0, y: 1 }, { x: 1, y: 0 }, 100, 100, 2);
  expect(down.length).toBeCloseTo(Math.SQRT2 * 100);
  expect(down.angle).toBeCloseTo(Math.PI / 4);
});

test("the chart draws a piece between each two points once it has a width", async () => {
  await render(
    <WeightChart
      points={chartPoints([
        { at: 0, value: 82 },
        { at: 14, value: 81 },
        { at: 28, value: 80 },
      ])}
      height={100}
      dots
      testID="chart"
    />,
  );
  expect(screen.queryAllByTestId("chart-piece", HIDDEN)).toHaveLength(0);
  await fireEvent(screen.getByTestId("chart", HIDDEN), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 100 } },
  });
  expect(screen.getAllByTestId("chart-piece", HIDDEN)).toHaveLength(2);
  expect(screen.getAllByTestId("chart-dot", HIDDEN)).toHaveLength(3);
});

test("changes and days in words", () => {
  expect(signedWeight(-2.8, "km")).toBe("−2.8 kg");
  expect(signedWeight(1.2, "km")).toBe("+1.2 kg");
  expect(signedWeight(0, "km")).toBe("0 kg");
  expect(signedWeight(-1, "mi")).toBe("−2.2 lb");
  expect(signedPercent(-3.398)).toBe("−3.4 %");
  expect(shortDay("2026-09-04", "2026-11-27")).toBe("4 Sep");
  expect(shortDay("2025-09-04", "2026-11-27")).toBe("Thu 4 Sep 2025");
});

test("the days of a period, both ends in", () => {
  expect(periodDays("2026-11-25", "2026-11-27")).toEqual([
    "2026-11-25",
    "2026-11-26",
    "2026-11-27",
  ]);
  expect(periodDays("2026-11-28", "2026-11-27")).toEqual([]);
});
