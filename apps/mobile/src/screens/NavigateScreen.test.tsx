import type { Direction } from "@shaperoute/shared-types";
import result from "@shaperoute/shared-types/fixtures/route-result.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Brightness from "expo-brightness";
import { activateKeepAwakeAsync } from "expo-keep-awake";
import { Alert, type AlertButton } from "react-native";

import { type Navigation, startNavigation } from "../navigation/navigator";
import { POCKET_BRIGHTNESS } from "../navigation/usePocketMode";
import { NavigationBanner, NavigationCard } from "./NavigateScreen";
import { POCKET_WARNING, resetPocketWarning } from "./PocketScreen";

jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(() => Promise.resolve(0.6)),
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

const directions = result.directions as Direction[];
const points = result.points as [number, number][];

/** Following the route, with the footway beside Via Rosmini as the next turn. */
function beforeFootway(footway: Direction): Navigation {
  const { navigation } = startNavigation(points, [
    directions[0],
    directions[1],
    footway,
    ...directions.slice(3),
  ]);
  return { ...navigation, next: 2, saidUpTo: 2, alongM: 1900 };
}

test("without the location, the banner says how to turn it on, by the app's name", async () => {
  await render(<NavigationBanner state={{ status: "denied" }} />);
  expect(
    screen.getByText("Location is off for Sgrava: allow it in Settings to navigate."),
  ).toBeOnTheScreen();
});

test("the banner says the street beside an unnamed road", async () => {
  const navigation = beforeFootway(directions[2]);
  await render(
    <NavigationBanner state={{ status: "following", navigation, position: null }} />,
  );
  expect(
    screen.getByText("Turn left onto the footpath beside Via Rosmini"),
  ).toBeTruthy();
});

test("the banner reads as before when the API has no along", async () => {
  const { along: _along, ...old } = directions[2];
  const navigation = beforeFootway(old);
  await render(
    <NavigationBanner state={{ status: "following", navigation, position: null }} />,
  );
  expect(screen.getByText("Turn left onto the footpath")).toBeTruthy();
});

/** Presses "Go dark" in the pocket-mode warning, if it is showing. */
function acceptWarning(alert: jest.SpyInstance) {
  const buttons = alert.mock.calls.at(-1)?.[2] as AlertButton[];
  buttons.find((button) => button.text === "Go dark")?.onPress?.();
}

describe("pocket mode", () => {
  const { navigation } = startNavigation(points, directions);
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    resetPocketWarning();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  test("the first time, it warns that locking the phone stops directions", async () => {
    await render(<NavigationCard navigation={navigation} onStop={() => {}} />);
    await fireEvent.press(screen.getByLabelText("Pocket mode"));
    expect(alert).toHaveBeenCalledWith(
      "Pocket mode",
      POCKET_WARNING,
      expect.any(Array),
    );
    expect(POCKET_WARNING).toContain("if you press the side button, directions stop");
    expect(screen.queryByText("Hold for 2 seconds to leave pocket mode")).toBeNull();

    await act(() => acceptWarning(alert));
    expect(screen.getByText("Hold for 2 seconds to leave pocket mode")).toBeTruthy();
    expect(activateKeepAwakeAsync).toHaveBeenCalled();
    expect(Brightness.setBrightnessAsync).toHaveBeenLastCalledWith(POCKET_BRIGHTNESS);
    // The first Modal of the run loads slowly on a busy machine.
  }, 20_000);

  test("after the warning, it starts straight away", async () => {
    await render(<NavigationCard navigation={navigation} onStop={() => {}} />);
    await fireEvent.press(screen.getByLabelText("Pocket mode"));
    await act(() => acceptWarning(alert));
    await fireEvent(screen.getByLabelText(/Hold for 2 seconds/), "longPress");

    await fireEvent.press(screen.getByLabelText("Pocket mode"));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Hold for 2 seconds to leave pocket mode")).toBeTruthy();
  });

  test("taps do nothing; only a hold brings the screen back", async () => {
    const onStop = jest.fn();
    await render(<NavigationCard navigation={navigation} onStop={onStop} />);
    await fireEvent.press(screen.getByLabelText("Pocket mode"));
    await act(() => acceptWarning(alert));
    const black = screen.getByLabelText(/Hold for 2 seconds/);

    await fireEvent.press(black);
    expect(screen.getByText("Hold for 2 seconds to leave pocket mode")).toBeTruthy();
    await fireEvent(black, "pressIn");
    expect(screen.getByText("Keep holding…")).toBeTruthy();
    await fireEvent(black, "pressOut");

    await fireEvent(black, "longPress");
    expect(screen.queryByText("Hold for 2 seconds to leave pocket mode")).toBeNull();
    expect(Brightness.setBrightnessAsync).toHaveBeenLastCalledWith(0.6);
    expect(onStop).not.toHaveBeenCalled();
  });

  test("cancelling the warning keeps the screen as it is", async () => {
    await render(<NavigationCard navigation={navigation} onStop={() => {}} />);
    await fireEvent.press(screen.getByLabelText("Pocket mode"));
    expect(screen.queryByText("Hold for 2 seconds to leave pocket mode")).toBeNull();
    expect(activateKeepAwakeAsync).not.toHaveBeenCalled();
  });

  test("arriving ends pocket mode, and there is no button to start it again", async () => {
    const view = await render(
      <NavigationCard navigation={navigation} onStop={() => {}} />,
    );
    await fireEvent.press(screen.getByLabelText("Pocket mode"));
    await act(() => acceptWarning(alert));

    await view.rerender(
      <NavigationCard
        navigation={{ ...navigation, arrived: true }}
        onStop={() => {}}
      />,
    );
    expect(screen.queryByText("Hold for 2 seconds to leave pocket mode")).toBeNull();
    expect(screen.queryByLabelText("Pocket mode")).toBeNull();
    expect(Brightness.setBrightnessAsync).toHaveBeenLastCalledWith(0.6);
  });
});

test("the way out is Stop during the run and Finish at the end (TASK-113)", async () => {
  const { navigation } = startNavigation(points, directions);
  const onStop = jest.fn();
  const view = await render(<NavigationCard navigation={navigation} onStop={onStop} />);
  expect(screen.getByText("Stop")).toBeTruthy();
  await view.rerender(
    <NavigationCard navigation={{ ...navigation, arrived: true }} onStop={onStop} />,
  );
  await fireEvent.press(screen.getByText("Finish"));
  expect(onStop).toHaveBeenCalledTimes(1);
});
