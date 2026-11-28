import {
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  type VideoOp,
} from "../share/videoScene";
import { color } from "../theme/tokens";
import { ALL_EXERCISES, exerciseByKey } from "./allExercises";
import { category, compose } from "./compose";
import type { Exercise } from "./exercises";
import { bones, drift, grounding, LENGTH, QUAD, STAND } from "./poses";
import { FRONT_LENGTH, HIP_HALF, SHOULDER_HALF } from "./posesFront";
import {
  depthAt,
  exerciseFrames,
  figureAt,
  FIGURE_ROOM,
  INTRO_S,
  OUTRO_S,
  type RoutineVideo,
  routineVideoScene,
  shownExercises,
  STAGE,
  STANDING,
} from "./routineVideo";

function exercise(key: string): Exercise {
  const found = exerciseByKey(key);
  if (found === undefined) {
    throw new Error(`no stretch ${key}`);
  }
  return found;
}

/** A category's routine, as its page would hand it to the video. */
function routineOf(key: string, minutes: number): RoutineVideo {
  const of = category(key);
  const routine = compose(of, { minutes, level: "gentle", where: "any" });
  return {
    title: "Neck",
    minutes: routine.choice.minutes,
    exercises: routine.exercises,
    tint: color.stretch[of.group],
  };
}

type Text = Extract<VideoOp, { k: "text" }>;
type Line = Extract<VideoOp, { k: "line" }>;

function texts(ops: readonly VideoOp[]): string[] {
  return ops.filter((op): op is Text => op.k === "text").map((op) => op.text);
}

/** The lengths of a line's pieces, in pixels. */
function pieces(points: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 2; i < points.length; i += 2) {
    out.push(Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]));
  }
  return out;
}

describe("the exercises a routine's video shows", () => {
  it("shows each one once, in the order it first comes", () => {
    const twice = routineOf("neck", 10).exercises;
    const once = shownExercises(twice);
    expect(twice.length).toBeGreaterThan(once.length);
    expect(new Set(once.map((e) => e.key)).size).toBe(once.length);
    expect(once.map((e) => e.key)).toEqual([...new Set(twice.map((e) => e.key))]);
  });

  it("gives each three seconds, less when they are many, never under one and a half", () => {
    expect(exerciseFrames(1)).toBe(3 * VIDEO_FPS);
    expect(exerciseFrames(8)).toBe(3 * VIDEO_FPS);
    expect(exerciseFrames(12)).toBe(2 * VIDEO_FPS);
    expect(exerciseFrames(16)).toBe(1.5 * VIDEO_FPS);
    expect(exerciseFrames(40)).toBe(1.5 * VIDEO_FPS);
  });
});

describe("how deep the figure is while an exercise is shown", () => {
  it("goes down and back once in a held pose", () => {
    const quad = exercise("quad");
    expect(depthAt(quad, 0, 3)).toBeCloseTo(0);
    expect(depthAt(quad, 1.5, 3)).toBeCloseTo(1);
    expect(depthAt(quad, 3, 3)).toBeCloseTo(0);
  });

  it("does a movement at its own pace, a whole number of times", () => {
    const swings = ALL_EXERCISES.find((e) => e.kind === "move" && e.tempoMs === 2000);
    if (swings === undefined) {
      throw new Error("no movement of two seconds");
    }
    // Three seconds hold two goes of it, not one and a half.
    expect(depthAt(swings, 0.75, 3)).toBeCloseTo(1);
    expect(depthAt(swings, 1.5, 3)).toBeCloseTo(0);
    expect(depthAt(swings, 3, 3)).toBeCloseTo(0);
  });
});

describe("the figure of the video", () => {
  const H = STAGE.height;

  it("stands on the floor, its feet forward to the left", () => {
    const drawn = figureAt({ pose: STAND }, 0, STAGE);
    const [farLeg, torso, , , nearLeg] = drawn.lines;
    expect(farLeg.far).toBe(true);
    expect(nearLeg.far).toBe(false);
    // Hip, knee, ankle, toe: straight down to the floor, the toe to the left.
    expect(nearLeg.points).toHaveLength(8);
    expect(nearLeg.points[5]).toBeCloseTo(STAGE.floor, 0);
    expect(nearLeg.points[7]).toBeCloseTo(STAGE.floor, 0);
    expect(nearLeg.points[6]).toBeCloseTo(STAGE.x - LENGTH.footNear * H, 0);
    // The torso from the hip straight up.
    expect(torso.points[0]).toBeCloseTo(STAGE.x, 0);
    expect(torso.points[3]).toBeCloseTo(torso.points[1] - LENGTH.torso * H, 0);
    expect(drawn.head.y).toBeLessThan(torso.points[3]);
  });

  it("puts every joint where the pose's numbers say", () => {
    const drawn = figureAt({ pose: QUAD }, 0, STAGE);
    const at = bones(QUAD);
    const x = (share: number) => STAGE.x + (drift(QUAD) - share) * H;
    const y = (share: number) => STAGE.floor + (share - grounding(QUAD)) * H;
    const nearLeg = drawn.lines[4].points;
    expect(nearLeg[2]).toBeCloseTo(x(at.thighNear.to.x), 0);
    expect(nearLeg[3]).toBeCloseTo(y(at.thighNear.to.y), 0);
    expect(nearLeg[6]).toBeCloseTo(x(at.footNear.to.x), 0);
    expect(nearLeg[7]).toBeCloseTo(y(at.footNear.to.y), 0);
    // The arms hang a little below the neck, as the app's figure has them.
    const nearArm = drawn.lines[3].points;
    expect(nearArm[1]).toBeCloseTo(y(-LENGTH.torso * 0.9), 0);
  });

  it("never stretches a limb, in any exercise, however deep", () => {
    for (const one of ALL_EXERCISES) {
      for (const depth of [0, 0.5, 1]) {
        const drawn = figureAt(one, depth, STAGE);
        const lengths = drawn.lines.map((line) => pieces(line.points));
        const expected =
          one.front === undefined
            ? [
                [LENGTH.thighFar, LENGTH.shinFar, LENGTH.footFar],
                [LENGTH.torso],
                [LENGTH.upperArmFar, LENGTH.forearmFar],
                [LENGTH.upperArmNear, LENGTH.forearmNear],
                [LENGTH.thighNear, LENGTH.shinNear, LENGTH.footNear],
              ]
            : [
                [
                  FRONT_LENGTH.shinLeft,
                  FRONT_LENGTH.thighLeft,
                  2 * HIP_HALF,
                  FRONT_LENGTH.thighRight,
                  FRONT_LENGTH.shinRight,
                ],
                [FRONT_LENGTH.torso],
                [
                  FRONT_LENGTH.forearmLeft,
                  FRONT_LENGTH.upperArmLeft,
                  2 * SHOULDER_HALF,
                  FRONT_LENGTH.upperArmRight,
                  FRONT_LENGTH.forearmRight,
                ],
              ];
        expect(lengths).toHaveLength(expected.length);
        lengths.forEach((line, i) =>
          line.forEach((length, j) => {
            // Each end is rounded to a tenth of a pixel.
            expect(Math.abs(length - expected[i][j] * H)).toBeLessThan(0.2);
          }),
        );
      }
    }
  });

  it("keeps every exercise whole in its room, between the bars and the words", () => {
    for (const one of ALL_EXERCISES) {
      for (const depth of [0, 0.25, 0.5, 0.75, 1]) {
        const drawn = figureAt(one, depth, STAGE);
        const half = drawn.width / 2;
        const xs: number[] = [drawn.head.x - drawn.head.r, drawn.head.x + drawn.head.r];
        const ys: number[] = [drawn.head.y - drawn.head.r, drawn.head.y + drawn.head.r];
        for (const line of drawn.lines) {
          for (let i = 0; i < line.points.length; i += 2) {
            xs.push(line.points[i] - half, line.points[i] + half);
            ys.push(line.points[i + 1] - half, line.points[i + 1] + half);
          }
        }
        const where = `${one.key} at ${depth}`;
        expect([where, Math.min(...xs) >= 0]).toEqual([where, true]);
        expect([where, Math.max(...xs) <= VIDEO_WIDTH]).toEqual([where, true]);
        expect([where, Math.min(...ys) >= FIGURE_ROOM.top]).toEqual([where, true]);
        expect([where, Math.max(...ys) <= FIGURE_ROOM.bottom]).toEqual([where, true]);
      }
    }
  });
});

describe("the video of a stretching routine", () => {
  const routine = routineOf("neck", 5);
  const scene = routineVideoScene(routine);
  const shown = shownExercises(routine.exercises);
  const each = exerciseFrames(shown.length);
  const intro = INTRO_S * VIDEO_FPS;

  it("is a vertical video the run's page can make as it is", () => {
    expect(scene.width).toBe(VIDEO_WIDTH);
    expect(scene.height).toBe(VIDEO_HEIGHT);
    expect(scene.fps).toBe(VIDEO_FPS);
    // No map to wait for, no animal to load: the page starts at once.
    expect(scene.map).toBeNull();
    expect(scene.character).toBeNull();
    expect(scene.frames).toHaveLength(
      intro + shown.length * each + Math.round(OUTRO_S * VIDEO_FPS),
    );
  });

  it("takes its colours from the tokens, the group's for what is lit", () => {
    expect(scene.colors.paper).toBe(color.background);
    expect(scene.colors.ink).toBe(color.text);
    expect(scene.colors.accent).toBe(color.accent);
    expect(scene.colors.line).toBe(color.stretch.body);
  });

  it("draws only what the page knows, on lines that are there", () => {
    for (const frame of scene.frames) {
      for (const op of frame) {
        expect(["line", "dot", "rect", "text"]).toContain(op.k);
        expect(op.alpha).toBeGreaterThanOrEqual(0);
        expect(op.alpha).toBeLessThanOrEqual(1);
        if (op.k === "line") {
          expect(scene.paths[op.path].length).toBeGreaterThanOrEqual(4);
        }
      }
    }
    expect(scene.paths.flat().every((n) => Number.isFinite(n))).toBe(true);
  });

  it("opens on the routine's name and its minutes, the figure standing in front", () => {
    const frame = scene.frames[intro / 2];
    expect(texts(frame)).toEqual([
      "MuW",
      `Stretching · 5 min · ${routine.exercises.length} exercises`,
      "Neck",
    ]);
    const standing = figureAt(STANDING, 0, STAGE);
    const drawn = frame
      .filter((op): op is Line => op.k === "line" && op.color === "ink")
      .map((op) => scene.paths[op.path]);
    expect(drawn).toEqual(standing.lines.map((line) => line.points));
  });

  it("shows each exercise in turn, with its name and its time", () => {
    shown.forEach((one, i) => {
      const frame = scene.frames[intro + i * each + each / 2];
      const time = one.sides ? `${one.seconds} s each side` : `${one.seconds} s`;
      expect(texts(frame)).toEqual(["MuW", time, one.name]);
    });
    // One side or both, the video says which.
    expect(shown.some((one) => one.sides)).toBe(true);
  });

  it("draws the figure in the exercise's pose, the far limbs fainter", () => {
    const frame = scene.frames[intro + each / 2];
    const lines = frame.filter(
      (op): op is Line => op.k === "line" && op.color === "ink",
    );
    const expected = figureAt(
      shown[0],
      depthAt(shown[0], 0.5 * (each / VIDEO_FPS), each / VIDEO_FPS),
      STAGE,
    );
    expect(lines.map((op) => scene.paths[op.path])).toEqual(
      expected.lines.map((line) => line.points),
    );
    expect(lines.map((op) => op.alpha)).toEqual(
      expected.lines.map((line) => (line.far ? 0.4 : 1)),
    );
    expect(frame.filter((op) => op.k === "dot" && op.fill === "ink")).toHaveLength(1);
  });

  it("fills the bar as the routine goes", () => {
    const filled = (i: number) =>
      scene.frames[i].find(
        (op): op is Extract<VideoOp, { k: "rect" }> =>
          op.k === "rect" && op.color === "line",
      )?.w ?? 0;
    expect(filled(0)).toBe(0);
    const half = filled(intro + Math.round((shown.length * each) / 2));
    const whole = filled(intro + shown.length * each - 1);
    expect(half).toBeGreaterThan(0);
    expect(whole).toBeGreaterThan(half * 1.9);
    expect(whole).toBeLessThanOrEqual(VIDEO_WIDTH);
  });

  it("ends on the logo alone", () => {
    const last = scene.frames[scene.frames.length - 1];
    expect(texts(last)).toEqual(["MuW"]);
    const heart = last.find((op): op is Line => op.k === "line");
    expect(heart?.path).toBe(1);
    expect(heart?.color).toBe("onAccent");
    expect(last.some((op) => op.k === "rect" && op.color === "accent")).toBe(true);
    expect(last.every((op) => op.k !== "line" || op.color !== "ink")).toBe(true);
  });

  it("is the same video every time", () => {
    expect(JSON.stringify(routineVideoScene(routine))).toBe(JSON.stringify(scene));
  });

  it("shows a routine that goes round only once, and stays small enough to hand over", () => {
    const long = routineOf("neck", 10);
    const made = routineVideoScene(long);
    const once = shownExercises(long.exercises);
    expect(made.frames).toHaveLength(
      intro +
        once.length * exerciseFrames(once.length) +
        Math.round(OUTRO_S * VIDEO_FPS),
    );
    // The most exercises a routine has: still under half a minute, and a
    // scene the page takes in one call.
    const many = routineVideoScene({
      ...long,
      exercises: ALL_EXERCISES.slice(0, 16),
    });
    expect(many.frames.length / VIDEO_FPS).toBeLessThan(30);
    expect(JSON.stringify(many).length).toBeLessThan(3_000_000);
  });
});
