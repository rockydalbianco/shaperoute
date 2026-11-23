/**
 * A turnpoint taken, said aloud (TASK-479 part D2): the tone, then the
 * names of the turnpoint taken and of the next, nothing else.
 */
import { say } from "../voice/runAudio";
import type { FlightTask, Turnpoint } from "./flightTask";
import { callText, callTurnpoint, resetTurnpointCall } from "./turnpointCall";

jest.mock("../voice/runAudio", () => ({ say: jest.fn() }));
jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  getAvailableVoicesAsync: jest.fn(),
}));

function tp(name: string, kind: Turnpoint["kind"]): Turnpoint {
  return {
    waypoint: {
      name,
      code: null,
      point: [46, 11],
      altM: null,
      landing: false,
      description: null,
    },
    radiusM: 400,
    kind,
  };
}

// An invented task.
const TASK: FlightTask = {
  earth: "wgs84",
  turnpoints: [
    tp("TO1", "takeoff"),
    tp("SS1", "start"),
    tp("B07", "turnpoint"),
    tp("GOAL", "goal"),
  ],
  start: { direction: "exit", gates: [], race: true },
  goal: { type: "cylinder", deadline: null },
};

beforeEach(() => jest.mocked(say).mockClear());

it("says the turnpoint taken and the next, or the goal", () => {
  expect(callText(TASK, 1)).toBe("Turnpoint SS1 taken. Next: B07.");
  expect(callText(TASK, 2)).toBe("Turnpoint B07 taken. Next: GOAL.");
  expect(callText(TASK, 3)).toBe("Goal GOAL taken.");
});

it("plays the tone, then speaks in the app's language", async () => {
  const play = jest.fn();
  const seekTo = jest.fn(() => Promise.resolve());
  resetTurnpointCall(() => ({ play, seekTo }));
  callTurnpoint(TASK, 2);
  await Promise.resolve();
  await Promise.resolve();
  expect(seekTo).toHaveBeenCalledWith(0);
  expect(play).toHaveBeenCalledTimes(1);
  expect(jest.mocked(say).mock.calls).toEqual([
    ["Turnpoint B07 taken. Next: GOAL.", { language: "en-US" }],
  ]);
});

it("still speaks when the phone cannot play the tone", () => {
  resetTurnpointCall(() => {
    throw new Error("no sound");
  });
  callTurnpoint(TASK, 3);
  expect(jest.mocked(say)).toHaveBeenCalledTimes(1);
});
