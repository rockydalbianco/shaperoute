import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { CategoryPage } from "./CategoryPage";
import { category, compose } from "./compose";
import { choiceFor, resetChoicesForTests } from "./stretchChoices";

jest.mock("../stretchSport/StretchSessionHost", () => ({
  startCategorySession: jest.fn(),
}));

const { startCategorySession } = jest.requireMock<{ startCategorySession: jest.Mock }>(
  "../stretchSport/StretchSessionHost",
);

const close = jest.fn();

async function open(key: string) {
  await render(<CategoryPage categoryKey={key} onClose={close} />);
}

function press(testID: string) {
  return act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

const radio = (testID: string) => screen.getByTestId(testID).props.accessibilityState;

beforeEach(() => {
  jest.useFakeTimers();
  resetChoicesForTests();
  startCategorySession.mockClear();
  close.mockClear();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("a stretching category's page", () => {
  it("opens on five minutes, gentle, with a mat, and lists that routine", async () => {
    await open("neck");
    const neck = category("neck");
    const routine = compose(neck, { minutes: 5, level: "gentle", where: "any" });
    expect(screen.getByRole("header", { name: "Neck" })).toBeOnTheScreen();
    expect(radio("stretch-minutes-5").checked).toBe(true);
    expect(radio("stretch-level-gentle").checked).toBe(true);
    expect(radio("stretch-where-any").checked).toBe(true);
    expect(
      screen.getByText(`5 min · ${routine.exercises.length} exercises`),
    ).toBeOnTheScreen();
    expect(screen.getByText("Held stretches")).toBeOnTheScreen();
    routine.exercises.forEach((exercise, i) => {
      expect(screen.getByTestId(`stretch-row-${i}`)).toHaveTextContent(
        new RegExp(exercise.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      );
    });
    expect(screen.queryByTestId(`stretch-row-${routine.exercises.length}`)).toBeNull();
    // One side's time, said as such for the ones done on each side.
    expect(screen.getAllByText(`${routine.hold} s each side`).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(`${routine.hold} s`).length).toBeGreaterThan(0);
    expect(screen.getByText("Stop if it hurts.")).toBeOnTheScreen();
    // No before and after, no word about doctors: it is not the back.
    expect(screen.queryByTestId("stretch-when")).toBeNull();
    expect(screen.queryByText(/medical advice/)).toBeNull();
  });

  it("shows off what the category does not have: nothing intense for the neck", async () => {
    await open("neck");
    expect(radio("stretch-level-intense").disabled).toBe(true);
    expect(radio("stretch-where-standing").disabled).toBe(false);
    await press("stretch-level-intense");
    expect(radio("stretch-level-gentle").checked).toBe(true);
  });

  it("makes the routine again at each choice", async () => {
    await open("hips");
    const hips = category("hips");
    await press("stretch-minutes-10");
    await press("stretch-level-intense");
    const routine = compose(hips, { minutes: 10, level: "intense", where: "any" });
    expect(radio("stretch-minutes-10").checked).toBe(true);
    expect(radio("stretch-level-intense").checked).toBe(true);
    expect(
      screen.getByText(`10 min · ${routine.exercises.length} exercises`),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("stretch-row-0")).toHaveTextContent(
      new RegExp(routine.exercises[0].name),
    );
  });

  it("starts that routine, keeps the choice for the next time and closes", async () => {
    await open("desk");
    const desk = category("desk");
    await press("stretch-minutes-3");
    await press("stretch-where-standing");
    await press("stretch-category-start");
    const routine = compose(desk, { minutes: 3, level: "gentle", where: "standing" });
    expect(startCategorySession).toHaveBeenCalledTimes(1);
    expect(startCategorySession).toHaveBeenCalledWith("desk", 3, routine.exercises);
    expect(close).toHaveBeenCalledTimes(1);
    expect(choiceFor(desk)).toEqual({ minutes: 3, level: "gentle", where: "standing" });
  });

  it("has «Before» and «After» for a sport, a moving warm-up before", async () => {
    await open("running_after");
    expect(screen.getByRole("header", { name: "Running" })).toBeOnTheScreen();
    expect(radio("stretch-when-after").checked).toBe(true);
    expect(screen.getByText("Held stretches")).toBeOnTheScreen();
    expect(radio("stretch-minutes-15").disabled).toBe(false);
    await press("stretch-when-before");
    expect(radio("stretch-when-before").checked).toBe(true);
    expect(screen.getByText("Moving warm-up")).toBeOnTheScreen();
    // A warm-up comes in 3, 5 and 10 minutes.
    expect(screen.queryByTestId("stretch-minutes-15")).toBeNull();
    await press("stretch-category-start");
    const before = category("running_before");
    expect(startCategorySession).toHaveBeenCalledWith(
      "running_before",
      5,
      compose(before, { minutes: 5, level: "gentle", where: "any" }).exercises,
    );
  });

  it("has the two of intimacy under one name", async () => {
    await open("intimacy_before");
    expect(screen.getByRole("header", { name: "Intimacy" })).toBeOnTheScreen();
    await press("stretch-when-after");
    await press("stretch-category-start");
    expect(startCategorySession.mock.calls[0][0]).toBe("intimacy_after");
  });

  it("says it is not medical advice on the two pages for the back", async () => {
    await open("lowerBack");
    expect(
      screen.getByText("This is not medical advice. If your back hurts, see a doctor."),
    ).toBeOnTheScreen();
  });

  it("has no standing version of what is all on the floor, and closes on «Close»", async () => {
    await open("relax");
    expect(radio("stretch-where-standing").disabled).toBe(true);
    expect(radio("stretch-level-intense").disabled).toBe(true);
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Close" }));
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(startCategorySession).not.toHaveBeenCalled();
  });
});
