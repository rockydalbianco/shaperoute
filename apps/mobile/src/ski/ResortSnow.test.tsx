import type { ResortSnow as Snow } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import { DrawingsContext, useDrawingsDoor } from "../social/drawingsDoor";
import { ResortSnow } from "./ResortSnow";

// «Snow today» on a resort's page (TASK-406 part D3).

const SNOW: Snow = {
  resort_id: "aaa1",
  since: "2026-11-08T09:00:00Z",
  snow: [
    { snow: "powder", days: 3 },
    { snow: "groomed", days: 1 },
  ],
};

function Page({ snow }: { snow: jest.Mock }) {
  const nothing = useDrawingsDoor();
  return (
    <DrawingsContext.Provider value={{ ...nothing, resortSnowOf: snow }}>
      <ResortSnow resortId="aaa1" />
    </DrawingsContext.Provider>
  );
}

test("the snow the members marked today, the most marked first", async () => {
  const snow = jest.fn(async () => SNOW);
  await render(<Page snow={snow} />);
  expect(snow).toHaveBeenCalledWith("aaa1");
  expect(await screen.findByText("Snow today")).toBeOnTheScreen();
  expect(screen.getByText("Powder ×3 · Groomed ×1")).toBeOnTheScreen();
  expect(
    screen.getByText("Marked by the members in the last 24 hours."),
  ).toBeOnTheScreen();
});

test("nobody marked it, or no answer: nothing", async () => {
  const none = jest.fn(async () => ({ ...SNOW, snow: [] }));
  await render(<Page snow={none} />);
  expect(none).toHaveBeenCalled();
  expect(screen.queryByTestId("resort-snow")).toBeNull();
  const failed = jest.fn(async () => null);
  await render(<Page snow={failed} />);
  expect(screen.queryByTestId("resort-snow")).toBeNull();
});
