/**
 * The vario's sound on the phone (TASK-479 part C): one looped player per
 * tone, made at its first use; a new tone stops the one before; the same
 * tone only sets the volume, and starts again once the phone has stopped
 * it; a player that fails leaves silence, not an error.
 */
import {
  playTone,
  resetTones,
  RESTART_AFTER_MS,
  stopTones,
  TONE_FILE_COUNT,
  type TonePlayer,
} from "./varioSound";
import { CLIMB_LEVELS, SINK_LEVELS } from "./varioTone";

type Fake = TonePlayer & { source: number; plays: number; pauses: number };

let made: Fake[] = [];

function fake(source: number): Fake {
  const player: Fake = {
    source,
    plays: 0,
    pauses: 0,
    loop: false,
    volume: 1,
    playing: false,
    play() {
      player.plays += 1;
      (player as { playing: boolean }).playing = true;
    },
    pause() {
      player.pauses += 1;
      (player as { playing: boolean }).playing = false;
    },
    seekTo: () => Promise.resolve(),
  };
  made.push(player);
  return player;
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  made = [];
  resetTones(fake);
  jest.spyOn(Date, "now").mockReturnValue(1_000_000);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("has a file for every tone", () => {
  expect(TONE_FILE_COUNT).toBe(CLIMB_LEVELS + SINK_LEVELS);
});

it("plays a tone as a loop, at the volume asked", async () => {
  playTone({ kind: "climb", level: 3 }, 0.65);
  await settle();
  expect(made).toHaveLength(1);
  expect(made[0].loop).toBe(true);
  expect(made[0].volume).toBe(0.65);
  expect(made[0].plays).toBe(1);
});

it("stops the tone before when the tone changes, and keeps its player", async () => {
  playTone({ kind: "climb", level: 3 }, 1);
  await settle();
  playTone({ kind: "sink", level: 0 }, 1);
  await settle();
  expect(made).toHaveLength(2);
  expect(made[0].pauses).toBe(1);
  expect(made[1].plays).toBe(1);
  playTone({ kind: "climb", level: 3 }, 1);
  await settle();
  expect(made).toHaveLength(2);
  expect(made[0].plays).toBe(2);
});

it("the same tone again sets only the volume", async () => {
  playTone({ kind: "climb", level: 0 }, 1);
  await settle();
  playTone({ kind: "climb", level: 0 }, 0.35);
  await settle();
  expect(made[0].plays).toBe(1);
  expect(made[0].volume).toBe(0.35);
});

it("starts the tone again once the phone has stopped it for a while", async () => {
  playTone({ kind: "climb", level: 0 }, 1);
  await settle();
  // A call stops it.
  (made[0] as { playing: boolean }).playing = false;
  playTone({ kind: "climb", level: 0 }, 1);
  await settle();
  expect(made[0].plays).toBe(1);
  jest.spyOn(Date, "now").mockReturnValue(1_000_000 + RESTART_AFTER_MS + 1);
  playTone({ kind: "climb", level: 0 }, 1);
  await settle();
  expect(made[0].plays).toBe(2);
});

it("goes quiet with null and with stopTones", async () => {
  playTone({ kind: "sink", level: 2 }, 1);
  await settle();
  playTone(null, 1);
  expect(made[0].pauses).toBe(1);
  playTone({ kind: "sink", level: 2 }, 1);
  await settle();
  stopTones();
  expect(made[0].pauses).toBe(2);
});

it("leaves silence when the phone cannot make a player", () => {
  resetTones(() => {
    throw new Error("no audio");
  });
  expect(() => playTone({ kind: "climb", level: 1 }, 1)).not.toThrow();
  expect(() => stopTones()).not.toThrow();
});
