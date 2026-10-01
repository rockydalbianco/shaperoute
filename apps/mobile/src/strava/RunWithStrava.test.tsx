import { fireEvent, render, screen } from "@testing-library/react-native";

import { RunWithStrava, STRAVA_HOME, STRAVA_ROUTE_BUILDER } from "./RunWithStrava";

async function openSheet(props: Partial<Parameters<typeof RunWithStrava>[0]> = {}) {
  const onExport = jest.fn();
  const openUrl = jest.fn().mockResolvedValue(undefined);
  await render(
    <RunWithStrava
      exporting={{ status: "idle" }}
      onExport={onExport}
      openUrl={openUrl}
      {...props}
    />,
  );
  await fireEvent.press(screen.getByText("Run with Strava"));
  return { onExport, openUrl };
}

test("explains first: nothing goes to Strava by itself", async () => {
  await openSheet();
  expect(screen.getByText("Run this route with Strava")).toBeOnTheScreen();
  expect(
    screen.getByText(/Strava does not let other apps add routes for you/),
  ).toBeOnTheScreen();
  expect(
    screen.getByText(/Nothing is sent to Strava until you upload/),
  ).toBeOnTheScreen();
});

test("step 1 saves the GPX with the app's own export", async () => {
  const { onExport, openUrl } = await openSheet();
  await fireEvent.press(screen.getByText("Save GPX"));
  expect(onExport).toHaveBeenCalled();
  expect(openUrl).not.toHaveBeenCalled();
});

test("steps 2 and 3 open Strava's route builder and Strava", async () => {
  const { openUrl } = await openSheet();
  await fireEvent.press(screen.getByText("Open Strava route builder"));
  expect(openUrl).toHaveBeenLastCalledWith(STRAVA_ROUTE_BUILDER);
  await fireEvent.press(screen.getByText("Open Strava"));
  expect(openUrl).toHaveBeenLastCalledWith(STRAVA_HOME);
  expect(STRAVA_ROUTE_BUILDER).toBe("https://www.strava.com/maps/create");
});

test("Strava that cannot be opened is said, with the address", async () => {
  const openUrl = jest.fn().mockRejectedValue(new Error("no handler"));
  await openSheet({ openUrl });
  await fireEvent.press(screen.getByText("Open Strava route builder"));
  expect(
    await screen.findByText(/could not be opened.*maps\/create/),
  ).toBeOnTheScreen();
});

test("a GPX being made, or failed, shows", async () => {
  const result = {
    points: [],
    distance_m: 0,
    similarity: 0,
    shape: null,
    warnings: [],
    directions: [],
  };
  await openSheet({ exporting: { status: "preparing", result } });
  expect(screen.getByText("Preparing GPX…")).toBeOnTheScreen();
});
