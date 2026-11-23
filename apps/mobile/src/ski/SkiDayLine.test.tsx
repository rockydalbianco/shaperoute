import skiDay from "@shaperoute/shared-types/fixtures/ski-day.json";
import type { SkiDay } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import { DrawingsContext, useDrawingsDoor } from "../social/drawingsDoor";
import { SkiDayLine } from "./SkiDayLine";

// «Resort», «Snow» and «Gear» on the post of a day of skiing (TASK-406 D2).

const DAY = skiDay as SkiDay;
const ID = "0b8f8a1e-7c1d-4d2a-9f3e-2a6c5b4d3e21";

function Line({ day }: { day: jest.Mock }) {
  const nothing = useDrawingsDoor();
  return (
    <DrawingsContext.Provider value={{ ...nothing, skiDayOf: day }}>
      <SkiDayLine drawingId={ID} />
    </DrawingsContext.Provider>
  );
}

test("the resort, the snow and the gear the skier gave", async () => {
  const day = jest.fn(async () => DAY);
  await render(<Line day={day} />);
  expect(day).toHaveBeenCalledWith(ID);
  expect(await screen.findByText("Test Valley")).toBeOnTheScreen();
  expect(screen.getByLabelText("Resort: Test Valley")).toBeOnTheScreen();
  expect(screen.getByLabelText("Snow: Powder")).toBeOnTheScreen();
  expect(screen.getByLabelText("Gear: Snowboard Burton Custom 158")).toBeOnTheScreen();
});

test("only what was given", async () => {
  const day = jest.fn(async () => ({ ...DAY, resort: null, gear: null }));
  await render(<Line day={day} />);
  expect(await screen.findByText("Powder")).toBeOnTheScreen();
  expect(screen.queryByText("Resort")).toBeNull();
  expect(screen.queryByText("Gear")).toBeNull();
});

test("a day without them, or no answer, shows nothing", async () => {
  const none = jest.fn(async () => ({ resort: null, gear: null, snow: null }));
  await render(<Line day={none} />);
  expect(none).toHaveBeenCalled();
  expect(screen.queryByTestId("ski-day")).toBeNull();
  const failed = jest.fn(async () => null);
  await render(<Line day={failed} />);
  expect(screen.queryByTestId("ski-day")).toBeNull();
});
