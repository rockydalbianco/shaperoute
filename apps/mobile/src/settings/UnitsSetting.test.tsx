import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { saveLanguageChoice } from "../i18n/language";
import { distanceLabel } from "../units/format";
import { phoneUnits } from "../units/phoneUnits";
import { loadUnitsChoice, saveUnitsChoice } from "../units/units";
import { useUnits } from "../units/useUnits";
import { UnitsSetting } from "./UnitsSetting";

// As it will be from part B: the app follows the phone's units while none
// is chosen. What it does until then is in `kmUntilPartB.test.tsx`.
jest.mock("../units/followsPhone", () => ({ FOLLOWS_PHONE: true }));

jest.mock("../units/units", () => {
  const actual = jest.requireActual<typeof import("../units/units")>("../units/units");
  return {
    ...actual,
    loadUnitsChoice: jest.fn(() => "phone"),
    saveUnitsChoice: jest.fn(actual.saveUnitsChoice),
  };
});

// The phone's own units: kilometres as in every test, miles where one says so.
jest.mock("../units/phoneUnits", () => ({ phoneUnits: jest.fn(() => "km") }));

/** A distance elsewhere in the app, in a component that follows the units. */
function Elsewhere() {
  useUnits();
  return <Text>{distanceLabel(5200)}</Text>;
}

afterEach(async () => {
  jest.mocked(phoneUnits).mockReturnValue("km");
  const { saveUnitsChoice: save } =
    jest.requireActual<typeof import("../units/units")>("../units/units");
  await act(async () => {
    save("phone");
    saveLanguageChoice("phone");
  });
  jest.mocked(saveUnitsChoice).mockClear();
  jest.mocked(loadUnitsChoice).mockReturnValue("phone");
});

test("the row says the units the app is in, and opens the choices", async () => {
  await render(<UnitsSetting />);
  const row = screen.getByRole("button", { name: "Units, Kilometres" });
  expect(row).toBeCollapsed();
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  expect(screen.queryByText("Soon")).toBeNull();
  await fireEvent.press(row);
  // The phone's units first, then the two.
  expect(
    screen.getAllByRole("radio").map((radio) => radio.props.accessibilityLabel),
  ).toEqual(["Phone units, Kilometres", "Kilometres", "Miles"]);
  expect(screen.getByRole("radio", { name: "Phone units, Kilometres" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Kilometres" })).not.toBeChecked();
  expect(screen.getByRole("radio", { name: "Miles" })).not.toBeChecked();
});

test("units chosen are kept, close the choices and turn the app to them at once", async () => {
  await render(
    <>
      <Elsewhere />
      <UnitsSetting />
    </>,
  );
  expect(screen.getByText("5.2 km")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Units, Kilometres" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Miles" }));
  expect(saveUnitsChoice).toHaveBeenCalledWith("mi");
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  expect(screen.getByRole("button", { name: "Units, Miles" })).toBeOnTheScreen();
  expect(screen.getByText("3.2 mi")).toBeOnTheScreen();
  expect(screen.queryByText("5.2 km")).toBeNull();

  await fireEvent.press(screen.getByRole("button", { name: "Units, Miles" }));
  expect(screen.getByRole("radio", { name: "Miles" })).toBeChecked();
  await fireEvent.press(screen.getByRole("radio", { name: "Kilometres" }));
  expect(saveUnitsChoice).toHaveBeenLastCalledWith("km");
  expect(screen.getByText("5.2 km")).toBeOnTheScreen();
});

test("the choice kept on the phone is the one checked at the next opening", async () => {
  jest.mocked(loadUnitsChoice).mockReturnValue("km");
  await render(<UnitsSetting />);
  await fireEvent.press(screen.getByRole("button", { name: "Units, Kilometres" }));
  expect(screen.getByRole("radio", { name: "Kilometres" })).toBeChecked();
  expect(
    screen.getByRole("radio", { name: "Phone units, Kilometres" }),
  ).not.toBeChecked();
});

test("«Phone units» goes back to following the phone: miles on a phone in miles", async () => {
  jest.mocked(phoneUnits).mockReturnValue("mi");
  jest.mocked(loadUnitsChoice).mockReturnValue("km");
  await render(
    <>
      <Elsewhere />
      <UnitsSetting />
    </>,
  );
  expect(screen.getByText("5.2 km")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Units, Kilometres" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Phone units, Miles" }));
  expect(saveUnitsChoice).toHaveBeenCalledWith("phone");
  expect(screen.getByRole("button", { name: "Units, Miles" })).toBeOnTheScreen();
  expect(screen.getByText("3.2 mi")).toBeOnTheScreen();
});

test("the row and its choices are in the app's language", async () => {
  await act(async () => saveLanguageChoice("it"));
  await render(<UnitsSetting />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Unità di misura, Chilometri" }),
  );
  expect(
    screen.getAllByRole("radio").map((radio) => radio.props.accessibilityLabel),
  ).toEqual(["Unità del telefono, Chilometri", "Chilometri", "Miglia"]);
});
