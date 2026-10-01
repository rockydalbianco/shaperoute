import done from "@shaperoute/shared-types/fixtures/themed-route-job-done.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { passedText, ThemedCard, themedGpx } from "./ThemedCard";
import type { ThemedResult } from "./themedRoutes";

const result = done.result as ThemedResult;
const request = { text: "luoghi famosi a Milano", centre: null, city: null };

test("shows the route, the places it passes by, and exports", async () => {
  const onExport = jest.fn();
  await render(
    <ThemedCard
      state={{ status: "done", request, result }}
      exporting={{ status: "idle" }}
      onExport={onExport}
      onCancel={jest.fn()}
      start={{ status: "idle" }}
      onStart={jest.fn()}
    />,
  );
  expect(screen.getByText("10.1 km")).toBeOnTheScreen();
  expect(
    screen.getByText(/Passes by 2 of the 6 famous places found/),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Export GPX"));
  expect(onExport).toHaveBeenCalled();
});

test("waiting, it can be cancelled; failed, it says why", async () => {
  const onCancel = jest.fn();
  const { rerender } = await render(
    <ThemedCard
      state={{ status: "waiting", request }}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onCancel={onCancel}
      start={{ status: "idle" }}
      onStart={jest.fn()}
    />,
  );
  await fireEvent.press(screen.getByText("Cancel"));
  expect(onCancel).toHaveBeenCalled();
  await rerender(
    <ThemedCard
      state={{ status: "failed", request, message: "No places here." }}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onCancel={onCancel}
      start={{ status: "idle" }}
      onStart={jest.fn()}
    />,
  );
  expect(screen.getByText("No places here.")).toBeOnTheScreen();
});

test("no place passed is said; the GPX is a drawn route's", () => {
  const none = { ...result, stops: result.stops.map((s) => ({ ...s, passed: false })) };
  expect(passedText(none)).toMatch(/passes by none of the 6/);
  expect(themedGpx(result)?.request).toMatchObject({
    shape: "star",
    distance_m: 10000,
  });
  expect(themedGpx({ ...result, shape: "unicorn" })).toBeNull();
});
