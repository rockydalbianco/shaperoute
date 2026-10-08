import { readFileSync } from "fs";
import { join } from "path";

import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { saveLanguageChoice } from "../i18n/language";
import { TABLES } from "../i18n/translate";
import { MIN_TAP_SIZE } from "../theme/tokens";
import {
  COMPATIBLE_SIZE,
  CONNECT_SIZE,
  ConnectWithStrava,
  StravaSwitch,
} from "./StravaParts";

jest.mock("expo-file-system");

afterEach(() => saveLanguageChoice("phone"));

const ASSETS = join(__dirname, "../../assets/strava");

/** Width and height of a PNG, from its header. */
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(join(ASSETS, file));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** The size an image is drawn at, and whether anything dims it. */
function drawn(testID: string) {
  const { width, height, opacity } = StyleSheet.flatten(
    screen.getByTestId(testID).props.style,
  );
  return { width, height, opacity };
}

describe("Strava's images (TASK-218)", () => {
  it.each([
    ["connect-with-strava", CONNECT_SIZE],
    ["compatible-with-strava", COMPATIBLE_SIZE],
  ])("%s is there at 1x, 2x and 3x, each the size it is shown at", (name, size) => {
    expect(pngSize(`${name}.png`)).toEqual(size);
    expect(pngSize(`${name}@2x.png`)).toEqual({
      width: size.width * 2,
      height: size.height * 2,
    });
    expect(pngSize(`${name}@3x.png`)).toEqual({
      width: size.width * 3,
      height: size.height * 3,
    });
  });

  it("keeps the button 48 pt high, as Strava's rules give it", () => {
    expect(CONNECT_SIZE.height).toBe(48);
    expect(CONNECT_SIZE.height).toBeGreaterThanOrEqual(MIN_TAP_SIZE);
  });
});

describe("«Connect with Strava»", () => {
  it("is Strava's own button, with nothing written over it", async () => {
    const onPress = jest.fn();
    await render(<ConnectWithStrava busy={false} onPress={onPress} />);
    expect(drawn("strava-connect")).toEqual({ ...CONNECT_SIZE, opacity: undefined });
    expect(screen.queryByText("Connect with Strava")).toBeNull();
    expect(screen.queryByTestId("strava-wheel")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Connect with Strava" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("busy, the button stays as it is, a wheel turns, a tap does nothing", async () => {
    const onPress = jest.fn();
    await render(<ConnectWithStrava busy onPress={onPress} />);
    expect(drawn("strava-connect")).toEqual({ ...CONNECT_SIZE, opacity: undefined });
    expect(screen.getByTestId("strava-wheel")).toBeOnTheScreen();
    const button = screen.getByRole("button", { name: "Opening Strava…" });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("says its name in the app's language; the image stays Strava's", async () => {
    saveLanguageChoice("it");
    await render(<ConnectWithStrava busy={false} onPress={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: TABLES.it["Connect with Strava"] }),
    ).toBeOnTheScreen();
    expect(drawn("strava-connect")).toMatchObject(CONNECT_SIZE);
  });
});

describe("«Send to Strava»", () => {
  it("has «Compatible with Strava» under its words, and is read as the switch", async () => {
    const onChange = jest.fn();
    await render(<StravaSwitch on={false} onChange={onChange} />);
    expect(screen.getByText("Send to Strava")).toBeOnTheScreen();
    expect(drawn("strava-compatible")).toMatchObject(COMPATIBLE_SIZE);
    await fireEvent.press(
      screen.getByRole("switch", { name: "Send to Strava", checked: false }),
    );
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("on, a tap turns it off", async () => {
    const onChange = jest.fn();
    await render(<StravaSwitch on onChange={onChange} />);
    await fireEvent.press(
      screen.getByRole("switch", { name: "Send to Strava", checked: true }),
    );
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
