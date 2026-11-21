import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import type { Exercise } from "./exercises";
import { STAND } from "./poses";
import { READY_S, StretchScreen, SWITCH_S, TICK_MS } from "./StretchScreen";

// TASK-475 part B: the stretching screen says what a session was as it
// ends (`onDone`), for the sport «Stretching» to keep it.

jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));
jest.mock("./chime", () => ({ chime: () => {}, tick: () => {} }));

const START = new Date("2026-11-21T07:00:00Z").getTime();

beforeEach(() => {
  jest.useFakeTimers({ now: START });
  jest
    .spyOn(AccessibilityInfo, "announceForAccessibility")
    .mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function wait(ms: number) {
  return act(() => jest.advanceTimersByTimeAsync(ms));
}

function press(name: string) {
  return act(async () => {
    fireEvent.press(screen.getByRole("button", { name }));
  });
}

/** Two short exercises, one on each side. */
const TWO: readonly Exercise[] = [
  {
    key: "a",
    name: "Quad stretch",
    howTo: "Pull.",
    sides: true,
    seconds: 3,
    pose: STAND,
  },
  {
    key: "b",
    name: "Calf stretch",
    howTo: "Step.",
    sides: false,
    seconds: 2,
    pose: STAND,
  },
];
/** The seconds of the two, to their end. */
const WHOLE_S = READY_S + 3 + SWITCH_S + 3 + READY_S + 2;

test("a session done to its end says its routine, length, time and exercises", async () => {
  const onDone = jest.fn();
  const onLeave = jest.fn();
  await render(
    <StretchScreen
      routine="morning"
      exercises={TWO}
      onDone={onDone}
      onLeave={onLeave}
    />,
  );
  await wait(WHOLE_S * TICK_MS);
  expect(onLeave).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledTimes(1);
  const done = onDone.mock.calls[0][0];
  expect(done).toMatchObject({
    routine: "morning",
    // Given its exercises, no length was chosen.
    minutes: null,
    startedAt: START,
    pauses: [],
    exercises: 2,
  });
  expect(done.endedAt - done.startedAt).toBe(WHOLE_S * TICK_MS);
});

test("the length chosen is told, and «Skip» is not an exercise held", async () => {
  const onDone = jest.fn();
  await render(<StretchScreen routine="afterRun" onDone={onDone} onLeave={() => {}} />);
  await press("3 min");
  await press("Skip");
  await press("End");
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(onDone.mock.calls[0][0]).toMatchObject({
    routine: "afterRun",
    minutes: 3,
    exercises: 0,
  });
});

test("a pause is told in seconds since the start, one open at the end too", async () => {
  const onDone = jest.fn();
  await render(
    <StretchScreen
      routine="morning"
      exercises={TWO}
      onDone={onDone}
      onLeave={() => {}}
    />,
  );
  await wait(2 * TICK_MS);
  await press("Pause");
  await wait(4 * TICK_MS);
  await press("Resume");
  await wait(1 * TICK_MS);
  await press("Pause");
  await wait(3 * TICK_MS);
  await press("End");
  const { pauses } = onDone.mock.calls[0][0];
  expect(pauses).toEqual([
    { from_s: 2, to_s: 6 },
    { from_s: 7, to_s: 10 },
  ]);
});

test("left before choosing how long, nothing is told", async () => {
  const onDone = jest.fn();
  const onLeave = jest.fn();
  await render(<StretchScreen routine="morning" onDone={onDone} onLeave={onLeave} />);
  await press("Not now");
  expect(onLeave).toHaveBeenCalledTimes(1);
  expect(onDone).not.toHaveBeenCalled();
});

test("without onDone the screen leaves as before", async () => {
  const onLeave = jest.fn();
  await render(<StretchScreen exercises={TWO} onLeave={onLeave} />);
  await press("End");
  expect(onLeave).toHaveBeenCalledTimes(1);
});
