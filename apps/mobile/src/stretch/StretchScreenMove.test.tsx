import { act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import type { Exercise } from "./exercises";
import { STAND } from "./poses";
import { FRONT_STAND, type FrontPose } from "./posesFront";
import { READY_S, StretchScreen, SWITCH_S, TICK_MS } from "./StretchScreen";

jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));
jest.mock("./chime", () => ({ chime: jest.fn(), tick: jest.fn() }));

type Drawn = Record<string, unknown>;
/** What each figure was last asked to draw. */
const mockSide: Drawn[] = [];
const mockFront: Drawn[] = [];
jest.mock("./Figure", () => ({
  Figure: (props: Drawn) => {
    mockSide.push(props);
    return null;
  },
}));
jest.mock("./FigureFront", () => ({
  FigureFront: (props: Drawn) => {
    mockFront.push(props);
    return null;
  },
}));

beforeEach(() => {
  jest.useFakeTimers();
  mockSide.length = 0;
  mockFront.length = 0;
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

function last(drawn: readonly Drawn[]): Drawn {
  return drawn[drawn.length - 1];
}

const SWING_FROM = { ...STAND, thighNear: 35 };
const SWING = { thighNear: -70 };
const TILT: FrontPose = { ...FRONT_STAND, head: 150 };

/** A movement seen from the side, then a tilt seen from the front. */
const TWO: readonly Exercise[] = [
  {
    key: "swing",
    name: "Leg swings",
    howTo: "Swing one leg.",
    sides: false,
    seconds: 4,
    pose: SWING_FROM,
    breath: SWING,
    kind: "move",
    tempoMs: 1600,
  },
  {
    key: "tilt",
    name: "Neck side tilt",
    howTo: "Tilt one ear.",
    sides: true,
    seconds: 3,
    pose: STAND,
    front: TILT,
    frontBreath: { head: -6 },
  },
];

describe("movements and the front view in a routine (TASK-520)", () => {
  it("draws a movement with the side figure, at the exercise's pace, only while its time runs", async () => {
    await render(<StretchScreen onLeave={jest.fn()} exercises={TWO} />);
    expect(screen.getByRole("header", { name: "Leg swings" })).toBeTruthy();
    expect(mockFront).toHaveLength(0);
    expect(last(mockSide)).toMatchObject({
      pose: SWING_FROM,
      breath: SWING,
      breathMs: 1600,
      breathing: false,
    });
    await wait(TICK_MS * READY_S);
    expect(last(mockSide)).toMatchObject({ breathing: true, breathMs: 1600 });
  });

  it("draws an exercise seen from the front with the front figure, then its other side", async () => {
    await render(<StretchScreen onLeave={jest.fn()} exercises={TWO} />);
    // The movement: get ready, then its four seconds.
    await wait(TICK_MS * (READY_S + 4));
    expect(screen.getByRole("header", { name: "Neck side tilt" })).toBeTruthy();
    const side = mockSide.length;
    expect(last(mockFront)).toMatchObject({
      pose: TILT,
      breath: { head: -6 },
      mirrored: false,
      breathing: false,
    });
    await wait(TICK_MS * READY_S);
    expect(last(mockFront)).toMatchObject({ breathing: true, mirrored: false });
    // The first side held, then «Switch sides».
    await wait(TICK_MS * 3);
    expect(last(mockFront)).toMatchObject({ mirrored: true, breathing: false });
    await wait(TICK_MS * SWITCH_S);
    expect(last(mockFront)).toMatchObject({ mirrored: true, breathing: true });
    // The side figure is not drawn again for it.
    expect(mockSide).toHaveLength(side);
  });

  it("gives a held exercise no pace of its own: it breathes as before", async () => {
    const held: Exercise = {
      ...TWO[0],
      key: "held",
      kind: undefined,
      tempoMs: undefined,
    };
    await render(<StretchScreen onLeave={jest.fn()} exercises={[held]} />);
    expect(last(mockSide).breathMs).toBeUndefined();
  });
});
