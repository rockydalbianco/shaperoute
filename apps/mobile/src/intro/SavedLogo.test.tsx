import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { type ReactNode } from "react";
import { AccessibilityInfo, StyleSheet, Text } from "react-native";

import { ActivitiesContext, useActivitiesDoor } from "../activities/activitiesDoor";
import { RunEnd } from "../activities/RunEnd";
import { color } from "../theme/tokens";
import { INTRO_TOTAL_MS } from "./LaunchIntro";
import { Root } from "./Root";
import {
  SAVED_MS,
  SAVED_SAID,
  SAVED_SHOWN_MS,
  SAVED_TOTAL_MS,
  SavedLogo,
  SavedLogoLayer,
  showSavedLogo,
} from "./SavedLogo";

jest.mock("expo-file-system");
jest.mock("../../App", () => {
  const { Text } = jest.requireActual("react-native");
  return { __esModule: true, default: () => <Text>The app</Text> };
});

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function wait(ms: number) {
  return act(() => jest.advanceTimersByTimeAsync(ms));
}

describe("the logo after «Save»", () => {
  it("is seen for a moment, shorter than the launch", () => {
    expect(SAVED_SHOWN_MS).toBeGreaterThanOrEqual(1000);
    expect(SAVED_TOTAL_MS).toBe(SAVED_MS.in + SAVED_MS.hold + SAVED_MS.fade);
    expect(SAVED_TOTAL_MS).toBeLessThan(INTRO_TOTAL_MS);
  });

  it("is the Sgrava logo on the launch's yellow, and a screen reader hears it", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    await render(<SavedLogo onDone={jest.fn()} />);
    const cover = StyleSheet.flatten(screen.getByLabelText(SAVED_SAID).props.style);
    expect(cover.backgroundColor).toBe(color.accent);
    expect(screen.getAllByRole("image")).toHaveLength(1);
    expect(announce).toHaveBeenCalledWith(SAVED_SAID);
  });

  it("is over only after all its steps", async () => {
    const onDone = jest.fn();
    await render(<SavedLogo onDone={onDone} />);
    await wait(SAVED_SHOWN_MS - 1);
    expect(onDone).not.toHaveBeenCalled();
    await wait(SAVED_MS.fade + 100);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("goes away at a tap, once", async () => {
    const onDone = jest.fn();
    await render(<SavedLogo onDone={onDone} />);
    await wait(200);
    await fireEvent.press(screen.getByLabelText(SAVED_SAID));
    await wait(SAVED_MS.fade + 100);
    expect(onDone).toHaveBeenCalledTimes(1);
    await wait(SAVED_TOTAL_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("does not call back when it is taken away half-way", async () => {
    const onDone = jest.fn();
    const { unmount } = await render(<SavedLogo onDone={onDone} />);
    await wait(500);
    await unmount();
    await wait(SAVED_TOTAL_MS);
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("its layer over the app", () => {
  it("shows nothing until a run is saved, then the logo, then the app alone", async () => {
    await render(
      <>
        <Text>The app</Text>
        <SavedLogoLayer />
      </>,
    );
    expect(screen.queryByTestId("saved-logo")).toBeNull();
    await act(() => showSavedLogo());
    expect(screen.getByTestId("saved-logo")).toBeOnTheScreen();
    expect(screen.getByText("The app")).toBeOnTheScreen();
    await wait(SAVED_TOTAL_MS + 100);
    expect(screen.queryByTestId("saved-logo")).toBeNull();
    // The next run saved brings it again.
    await act(() => showSavedLogo());
    expect(screen.getByTestId("saved-logo")).toBeOnTheScreen();
  });

  it("is in the app the phone opens, under the launch animation", async () => {
    await render(<Root />);
    expect(screen.queryByTestId("saved-logo")).toBeNull();
    await wait(INTRO_TOTAL_MS + 100);
    expect(screen.queryByTestId("launch-intro")).toBeNull();
    await act(() => showSavedLogo());
    expect(screen.getByTestId("saved-logo")).toBeOnTheScreen();
  });
});

describe("«Save» at the end of a run", () => {
  /** An account is signed in: the end of the run has «Save». */
  function SignedIn({ children }: { children: ReactNode }) {
    const door = useActivitiesDoor();
    return (
      <ActivitiesContext.Provider value={{ ...door, signedIn: true }}>
        {children}
      </ActivitiesContext.Provider>
    );
  }

  async function endOfRun(onSave: () => boolean) {
    await render(
      <SignedIn>
        <RunEnd onSave={onSave} onDiscard={jest.fn()} />
        <SavedLogoLayer />
      </SignedIn>,
    );
  }

  it("brings the logo up once the run is kept", async () => {
    const onSave = jest.fn(() => true);
    await endOfRun(onSave);
    expect(screen.queryByTestId("saved-logo")).toBeNull();
    await fireEvent.press(
      screen.getByRole("button", { name: "Save to My activities" }),
    );
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("saved-logo")).toBeOnTheScreen();
  });

  it("does not, when the phone could not keep the run", async () => {
    await endOfRun(() => false);
    await fireEvent.press(
      screen.getByRole("button", { name: "Save to My activities" }),
    );
    expect(
      screen.getByText("This run could not be kept on the phone. Try again."),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("saved-logo")).toBeNull();
  });

  it("does not at «Discard»", async () => {
    await endOfRun(() => true);
    await fireEvent.press(screen.getByRole("button", { name: "Discard" }));
    await fireEvent.press(screen.getByRole("button", { name: "Discard run" }));
    expect(screen.queryByTestId("saved-logo")).toBeNull();
  });
});
