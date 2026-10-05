import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { UnitsSetting } from "../settings/UnitsSetting";
import { FOLLOWS_PHONE } from "./followsPhone";
import { phoneUnits } from "./phoneUnits";
import { appUnits, loadUnitsChoice, saveUnitsChoice, unitsOf } from "./units";

// Until part B (the user's choice of 2026-10-05, ADR-0149): a phone in
// miles starts in kilometres, and «Settings» offers the two units only.

jest.mock("./phoneUnits", () => ({ phoneUnits: jest.fn(() => "mi") }));

afterEach(async () => {
  await act(async () => saveUnitsChoice("phone"));
});

test("the app does not follow the phone yet", () => {
  expect(FOLLOWS_PHONE).toBe(false);
  expect(phoneUnits()).toBe("mi");
  expect(loadUnitsChoice()).toBe("phone");
  expect(unitsOf("phone")).toBe("km");
  expect(appUnits()).toBe("km");
  // A unit chosen is the unit shown, whatever the phone says.
  expect(unitsOf("mi")).toBe("mi");
  expect(unitsOf("km")).toBe("km");
});

test("«Settings» starts on «Kilometres» and offers «Miles», without «Phone units»", async () => {
  await render(<UnitsSetting />);
  await fireEvent.press(screen.getByRole("button", { name: "Units, Kilometres" }));
  expect(
    screen.getAllByRole("radio").map((radio) => radio.props.accessibilityLabel),
  ).toEqual(["Kilometres", "Miles"]);
  expect(screen.getByRole("radio", { name: "Kilometres" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Miles" })).not.toBeChecked();

  await fireEvent.press(screen.getByRole("radio", { name: "Miles" }));
  expect(screen.getByRole("button", { name: "Units, Miles" })).toBeOnTheScreen();
  expect(appUnits()).toBe("mi");
  await fireEvent.press(screen.getByRole("button", { name: "Units, Miles" }));
  expect(screen.getByRole("radio", { name: "Miles" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Kilometres" })).not.toBeChecked();
});
