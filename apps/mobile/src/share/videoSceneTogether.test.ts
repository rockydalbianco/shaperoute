/**
 * The «Together» video (TASK-417 part D2b): every runner framed together,
 * the others in their colours with their names, the author's own line at
 * its real pace on the one clock, a ⚡ where two met; a video of one as
 * before.
 */
import type { LatLon, TogetherPage } from "@shaperoute/shared-types";

import { POST_RESULTS } from "./postRun";
import { togetherTracks } from "./togetherClock";
import { type VideoOp, videoScene } from "./videoScene";

/** A line north from Trento, a point every 100 m. */
function north(metres: number, east = 0): LatLon[] {
  return Array.from({ length: Math.floor(metres / 100) + 1 }, (_, i): LatLon => [
    46.0671 + (i * 100) / 111_320,
    11.1214 + east,
  ]);
}

function person(name: string, line: LatLon[], startS: number, stepS: number) {
  return {
    public_id: `id-${name}`,
    username: name,
    points: line,
    seconds: line.map((_, i) => startS + i * stepS),
    pauses: [],
  };
}

const MINE = north(3000);
const RUN = {
  key: null,
  title: "Together in Trento",
  track: MINE,
  distanceM: 3000,
  durationMs: 15 * 60 * 1000,
};
// The author at 30 s a point; Anna, 300 m east, faster; Bob, beside the author.
const PAGE: TogetherPage = {
  people: [
    person("me", MINE, 0, 30),
    person("anna", north(3000, 0.004), 60, 20),
    person("bob", north(3000, 0.00001), 0, 30),
  ],
};
const TRACKS = togetherTracks(PAGE, "yellow");

function runners(op: VideoOp[]): Extract<VideoOp, { k: "runner" }>[] {
  return op.filter(
    (one): one is Extract<VideoOp, { k: "runner" }> => one.k === "runner",
  );
}

test("a video of one has no other runner, as before", () => {
  const alone = videoScene(RUN, POST_RESULTS, [], "night");
  const once = videoScene(RUN, POST_RESULTS, [], "night", { runners: null });
  expect(once).toEqual(alone);
  expect(alone.together).toBeUndefined();
  expect(alone.frames.flat().some((op) => op.k === "runner")).toBe(false);
});

test("the others run their own lines, in their colours, with their names", () => {
  const scene = videoScene(RUN, POST_RESULTS, [], "night", { runners: TRACKS });
  expect(scene.together?.paths).toHaveLength(2);
  const last = runners(scene.frames[scene.frames.length - 1]!);
  expect(last.map((op) => op.name)).toEqual(["anna", "bob"]);
  expect(new Set(last.map((op) => op.color)).size).toBe(2);
  for (const op of last) {
    expect(scene.paths[op.path]!.length).toBeGreaterThanOrEqual(4);
  }
});

test("on the one clock the faster runner is further along", () => {
  const scene = videoScene(RUN, POST_RESULTS, [], "night", { runners: TRACKS });
  const middle = scene.frames[Math.floor(scene.frames.length * 0.55)]!;
  const [anna, bob] = runners(middle);
  const shareOf = (op: Extract<VideoOp, { k: "runner" }>) => {
    const path = scene.paths[op.path]!;
    let length = 0;
    for (let i = 2; i < path.length; i += 2) {
      length += Math.hypot(path[i]! - path[i - 2]!, path[i + 1]! - path[i - 1]!);
    }
    return op.upTo / length;
  };
  expect(shareOf(anna!)).toBeGreaterThan(shareOf(bob!));
});

test("side by side, a ⚡ springs up, not on every picture", () => {
  const scene = videoScene(RUN, POST_RESULTS, [], "night", { runners: TRACKS });
  const marked = scene.frames.filter((frame) =>
    frame.some((op) => op.k === "emoji" && op.text === "⚡"),
  );
  expect(marked.length).toBeGreaterThan(0);
  expect(marked.length).toBeLessThan(scene.frames.length / 2);
});

test("on «3D» the page gets every line to lay on the hills", () => {
  const scene = videoScene(RUN, POST_RESULTS, [], "3d", { runners: TRACKS });
  expect(scene.map?.together).toHaveLength(3);
  const last = runners(scene.frames[scene.frames.length - 1]!);
  expect(last.map((op) => op.geo)).toEqual([1, 2]);
  expect(last.every((op) => op.share === 1)).toBe(true);
});
