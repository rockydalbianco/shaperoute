import detail from "@shaperoute/shared-types/fixtures/drawing.json";
import skiDayParts from "@shaperoute/shared-types/fixtures/ski-day-parts.json";
import type {
  DrawingDetail,
  LatLon,
  SkiDay,
  SkiDayPart,
} from "@shaperoute/shared-types";
import { act, render } from "@testing-library/react-native";
import type { ReactNode } from "react";

import {
  DrawingsContext,
  type DrawingsDoor,
  useDrawingsDoor,
} from "../social/drawingsDoor";
import { type SkiDayMap, skiDayMapOf, useSkiDayMap } from "./useSkiDayMap";

// A saved day of skiing opened on the map (TASK-429 part C): its lifts and
// the numbers of its parts from the server's fixes; any other post as before.

const track: LatLon[] = Array.from({ length: 51 }, (_, i) => [46 + i / 1000, 11]);
const parts = skiDayParts.parts as SkiDayPart[];
const day: DrawingDetail = {
  ...(detail as unknown as DrawingDetail),
  id: "d1",
  activity: "skiing",
  track,
};

test("the lifts and the numbers of the parts that have their fixes", () => {
  const map = skiDayMapOf(track, parts);
  expect(map?.lifts).toEqual([{ from: 0, to: 20 }]);
  // The third part has no fixes: no number for it.
  expect(map?.labels).toEqual([
    { point: track[10], text: "L1", kind: "lift" },
    { point: track[35], text: "1", kind: "descent" },
  ]);
});

test("no lift with fixes, nothing to draw apart", () => {
  expect(
    skiDayMapOf(
      track,
      parts.filter((part) => part.kind === "descent"),
    ),
  ).toBeNull();
  const off = parts.map((part) => ({
    ...part,
    to_fix: part.to_fix === null ? null : 400,
  }));
  expect(skiDayMapOf(track, off)).toBeNull();
});

function DoorWith({
  children,
  skiDayOf,
}: {
  children: ReactNode;
  skiDayOf: DrawingsDoor["skiDayOf"];
}) {
  const door = useDrawingsDoor();
  return (
    <DrawingsContext.Provider value={{ ...door, skiDayOf }}>
      {children}
    </DrawingsContext.Provider>
  );
}

async function mapOf(drawing: DrawingDetail | null, answer: SkiDay | null) {
  const seen: (SkiDayMap | null)[] = [];
  function Probe() {
    seen.push(useSkiDayMap(drawing));
    return null;
  }
  const skiDayOf = jest.fn(async () => answer);
  await render(
    <DoorWith skiDayOf={skiDayOf}>
      <Probe />
    </DoorWith>,
  );
  await act(async () => {});
  return { last: seen[seen.length - 1], skiDayOf };
}

test("a day of skiing with parts is drawn with its lifts", async () => {
  const { last, skiDayOf } = await mapOf(day, skiDayParts as unknown as SkiDay);
  expect(skiDayOf).toHaveBeenCalledWith("d1");
  expect(last?.lifts).toEqual([{ from: 0, to: 20 }]);
});

test("another post, or a day without parts, as before", async () => {
  const run = await mapOf(
    { ...day, activity: "running" },
    skiDayParts as unknown as SkiDay,
  );
  expect(run.skiDayOf).not.toHaveBeenCalled();
  expect(run.last).toBeNull();
  const bare = await mapOf(day, { resort: null, gear: null, snow: null });
  expect(bare.last).toBeNull();
  expect((await mapOf(null, null)).last).toBeNull();
});
