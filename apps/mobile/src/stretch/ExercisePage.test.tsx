import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { color } from "../theme/tokens";
import { exerciseByKey } from "./allExercises";
import { BREATH_S, ExercisePage, TRY_MINUTES, tryOf } from "./ExercisePage";
import type { Exercise } from "./exercises";
import { TICK_MS } from "./StretchScreen";

jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));
jest.mock("./chime", () => ({ chime: () => {}, tick: () => {} }));

const close = jest.fn();
const of = (key: string, seconds: number): Exercise => ({
  ...(exerciseByKey(key) as Exercise),
  seconds,
});

async function open(exercise: Exercise) {
  await render(
    <ExercisePage exercise={exercise} tint={color.stretch.body} onClose={close} />,
  );
}

const wait = (seconds: number) =>
  act(() => jest.advanceTimersByTimeAsync(seconds * TICK_MS));
const press = (testID: string) =>
  act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
const clock = () => screen.getByTestId("stretch-exercise-clock").props.children;
const lit = () =>
  screen.queryAllByTestId("stretch-ring-on", { includeHiddenElements: true });

beforeEach(() => {
  jest.useFakeTimers();
  close.mockClear();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("an exercise's page", () => {
  it("says what the exercise is: its hold, its sides, where, how, and what for", async () => {
    await open(of("hipFlexor", 30));
    expect(
      screen.getByRole("header", { name: "Hip flexor stretch" }),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Hold: 30 s")).toBeOnTheScreen();
    expect(screen.getByLabelText("Sides: Both")).toBeOnTheScreen();
    expect(screen.getByLabelText("Position: Floor")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "How to" })).toBeOnTheScreen();
    expect(
      screen.getByText("Kneel on one knee. Push your hips forward, chest up."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Good for" })).toBeOnTheScreen();
    const good = screen.getByTestId("stretch-good-for");
    expect(good).toHaveTextContent(/Hips & pelvis/);
    expect(good).toHaveTextContent(/After sitting/);
    expect(good).toHaveTextContent(/Running · After/);
    expect(good).toHaveTextContent(/Splits/);
    expect(screen.getByText("Stop if it hurts.")).toBeOnTheScreen();
    expect(screen.getByText(`Try it · ${TRY_MINUTES} min`)).toBeOnTheScreen();
  });

  it("says one side for an exercise with none, and standing or a chair as it is", async () => {
    await open(of("overheadReach", 20));
    expect(screen.getByLabelText("Sides: One")).toBeOnTheScreen();
    expect(screen.getByLabelText("Position: Standing")).toBeOnTheScreen();
    expect(screen.getByLabelText("Hold: 20 s")).toBeOnTheScreen();
    await screen.unmount();
    await open(of("chairFigureFour", 30));
    expect(screen.getByLabelText("Position: Chair")).toBeOnTheScreen();
  });

  it("counts the seconds down, the ring going out with them", async () => {
    await open(of("overheadReach", 24));
    expect(clock()).toBe("0:24");
    expect(lit()).toHaveLength(48);
    await wait(12);
    expect(clock()).toBe("0:12");
    expect(lit()).toHaveLength(24);
    expect(screen.getByLabelText("12 seconds left")).toBeOnTheScreen();
    await wait(12);
    expect(clock()).toBe("0:00");
    expect(lit()).toHaveLength(0);
    // And again from the top.
    await wait(1);
    expect(clock()).toBe("0:24");
    expect(lit()).toHaveLength(48);
  });

  it("says when to breathe in and out, four seconds each", async () => {
    await open(of("overheadReach", 30));
    const under = () => screen.getByTestId("stretch-exercise-under");
    expect(under()).toHaveTextContent("Breathe in");
    await wait(BREATH_S);
    expect(under()).toHaveTextContent("Breathe out");
    await wait(BREATH_S);
    expect(under()).toHaveTextContent("Breathe in");
  });

  it("does one side and then the other, saying which", async () => {
    await open(of("hipFlexor", 10));
    const under = () => screen.getByTestId("stretch-exercise-under");
    expect(under()).toHaveTextContent("Right side · Breathe in");
    await wait(11);
    expect(clock()).toBe("0:10");
    expect(under()).toHaveTextContent(/^Left side/);
    await wait(11);
    expect(under()).toHaveTextContent(/^Right side/);
  });

  it("says no breath for a movement, which has its own pace", async () => {
    await open(of("armCircles", 30));
    expect(screen.queryByTestId("stretch-exercise-under")).toBeNull();
    await screen.unmount();
    await open(of("legSwings", 30));
    expect(screen.getByTestId("stretch-exercise-under")).toHaveTextContent(
      /^Right side$/,
    );
  });

  it("stops the time on «Pause» and goes on on «Play»", async () => {
    await open(of("overheadReach", 30));
    await wait(5);
    expect(clock()).toBe("0:25");
    expect(screen.getByRole("button", { name: "Pause" })).toBeOnTheScreen();
    await press("stretch-exercise-toggle");
    expect(screen.getByRole("button", { name: "Play" })).toBeOnTheScreen();
    await wait(20);
    expect(clock()).toBe("0:25");
    await press("stretch-exercise-toggle");
    await wait(5);
    expect(clock()).toBe("0:20");
  });

  it("opens the stretching screen on that exercise alone for a minute, and comes back", async () => {
    expect(tryOf(of("overheadReach", 20)).seconds).toBe(60);
    // Half a minute a side.
    expect(tryOf(of("hipFlexor", 20)).seconds).toBe(30);
    await open(of("hipFlexor", 20));
    expect(screen.queryByTestId("stretch-screen")).toBeNull();
    await press("stretch-exercise-try");
    expect(screen.getByTestId("stretch-screen")).toBeOnTheScreen();
    expect(screen.getByText("1 of 1")).toBeOnTheScreen();
    // The page's own time waits meanwhile.
    await wait(8);
    await act(async () => {
      // The only exercise is the last one: «Done» leaves.
      fireEvent.press(screen.getByRole("button", { name: "Done" }));
    });
    expect(screen.queryByTestId("stretch-screen")).toBeNull();
    expect(clock()).toBe("0:20");
  });

  it("closes on «Close»", async () => {
    await open(of("neck", 20));
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Close" }));
    });
    expect(close).toHaveBeenCalledTimes(1);
  });
});
