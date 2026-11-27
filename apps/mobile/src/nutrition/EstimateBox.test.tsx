import { fireEvent, render, screen } from "@testing-library/react-native";

import type { BodyProfile } from "../body/bodyProfile";
import { useBody } from "../body/useBody";
import { EstimateBox } from "./EstimateBox";

// MuW's estimate behind the user's own number (TASK-489 part J). What it
// says at the door is tried in NutritionWelcome.test.tsx; here, the moment
// before the usual day is known.

jest.mock("../body/useBody", () => ({ useBody: jest.fn() }));

const body = jest.mocked(useBody);
const MAN: BodyProfile = { sex: "male", weightKg: 90, heightCm: 175, birthYear: 1986 };

test("while the usual day is being counted the link waits, and asks for no data", async () => {
  body.mockReturnValue(MAN);
  const onUse = jest.fn();
  const view = await render(
    <EstimateBox purpose="track" usedPerDay={null} year={2026} onUse={onUse} />,
  );
  await fireEvent.press(screen.getByTestId("estimate-open"));
  // The body data are there: MuW does not say it needs them.
  expect(screen.queryByTestId("estimate-none")).toBeNull();
  expect(screen.getByTestId("estimate-open")).toBeBusy();

  // The number comes: the box asked for opens by itself.
  await view.rerender(
    <EstimateBox purpose="track" usedPerDay={2800} year={2026} onUse={onUse} />,
  );
  expect(screen.getByTestId("estimate-number")).toHaveTextContent(/2800 kcal a day/);
});

test("with the body data missing MuW says what it needs, usual day or not", async () => {
  body.mockReturnValue({ ...MAN, weightKg: null });
  await render(
    <EstimateBox purpose="track" usedPerDay={null} year={2026} onUse={jest.fn()} />,
  );
  await fireEvent.press(screen.getByTestId("estimate-open"));
  expect(screen.getByTestId("estimate-none")).toHaveTextContent(
    /MuW needs your weight, height, year of birth and sex/,
  );
});
