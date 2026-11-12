import { EXERCISES, routineSeconds, SIDE_SECONDS } from "./exercises";
import {
  bones,
  BREATH_MAX_DEGREES,
  CALF,
  deepen,
  GLUTE,
  grounding,
  HAMSTRING,
  HIP_FLEXOR,
  LENGTH,
  type Pose,
  QUAD,
  SEGMENTS,
  span,
  STAND,
} from "./poses";

const POSES: Record<string, Pose> = { STAND, QUAD, HAMSTRING, CALF, HIP_FLEXOR, GLUTE };

describe("the figure's poses", () => {
  it("give every segment a direction", () => {
    for (const pose of Object.values(POSES)) {
      for (const segment of SEGMENTS) {
        expect(typeof pose[segment]).toBe("number");
      }
    }
  });

  it("stand on the feet: both on the floor, the hip a leg above it", () => {
    const standing = bones(STAND);
    expect(standing.footFar.from.y).toBeCloseTo(LENGTH.thighFar + LENGTH.shinFar, 6);
    expect(standing.footNear.from.y).toBeCloseTo(LENGTH.thighNear + LENGTH.shinNear, 6);
    expect(grounding(STAND)).toBeCloseTo(LENGTH.thighFar + LENGTH.shinFar, 6);
    // The feet point forward, flat on the floor.
    expect(standing.footNear.to.x).toBeGreaterThan(standing.footNear.from.x);
    expect(standing.footNear.to.y).toBeCloseTo(standing.footNear.from.y, 6);
  });

  it("keep the head above the hip in every exercise", () => {
    for (const [name, pose] of Object.entries(POSES)) {
      const { head } = bones(pose);
      expect({ name, y: head.to.y }).toEqual({ name, y: expect.any(Number) });
      expect(head.to.y).toBeLessThan(-LENGTH.torso * 0.6);
    }
  });

  it("keep one foot on the floor in every exercise", () => {
    for (const pose of Object.values(POSES)) {
      const { footFar, footNear } = bones(pose);
      const floor = grounding(pose);
      const onFloor = (y: number) => Math.abs(y - floor) < 0.02;
      expect(
        onFloor(footFar.from.y) ||
          onFloor(footFar.to.y) ||
          onFloor(footNear.from.y) ||
          onFloor(footNear.to.y),
      ).toBe(true);
    }
  });

  it("kneel on the far knee for the hip flexor, the shin flat on the floor", () => {
    const { shinFar, thighFar } = bones(HIP_FLEXOR);
    const floor = grounding(HIP_FLEXOR);
    expect(Math.abs(thighFar.to.y - floor)).toBeLessThan(0.02);
    expect(Math.abs(shinFar.to.y - floor)).toBeLessThan(0.02);
    // The hip sits lower than when standing.
    expect(floor).toBeLessThan(grounding(STAND));
  });

  it("pull the near heel up to the glutes for the quad stretch", () => {
    const { shinNear, torso } = bones(QUAD);
    expect(shinNear.to.y).toBeGreaterThan(torso.from.y - 0.1);
    expect(shinNear.to.y).toBeLessThan(bones(STAND).shinNear.to.y - 0.3);
  });

  it("puts the near heel on the floor for the hamstring stretch, toes up", () => {
    const { footNear, thighNear } = bones(HAMSTRING);
    expect(Math.abs(footNear.from.y - grounding(HAMSTRING))).toBeLessThan(0.02);
    expect(footNear.from.x).toBeGreaterThan(thighNear.from.x + 0.1);
    expect(footNear.to.y).toBeLessThan(footNear.from.y);
  });

  it("rests the near ankle on the far knee for the glute stretch", () => {
    const { shinNear, thighFar } = bones(GLUTE);
    expect(Math.abs(shinNear.to.x - thighFar.to.x)).toBeLessThan(0.03);
    expect(Math.abs(shinNear.to.y - thighFar.to.y)).toBeLessThan(0.03);
  });

  it("fit in a box a little wider than the figure is tall", () => {
    for (const pose of Object.values(POSES)) {
      const { back, front } = span(pose);
      expect(front - back).toBeLessThan(1.1);
      expect(grounding(pose)).toBeLessThanOrEqual(
        LENGTH.thighFar + LENGTH.shinFar + 0.001,
      );
    }
  });
});

describe("the five exercises", () => {
  it("are five, each with a name, a line on how, and a pose", () => {
    expect(EXERCISES).toHaveLength(5);
    for (const exercise of EXERCISES) {
      expect(exercise.name.length).toBeGreaterThan(0);
      expect(exercise.howTo.length).toBeGreaterThan(0);
      expect(exercise.seconds).toBe(SIDE_SECONDS);
      expect(SEGMENTS.every((s) => typeof exercise.pose[s] === "number")).toBe(true);
    }
    expect(new Set(EXERCISES.map((e) => e.key)).size).toBe(5);
  });

  it("take three minutes and twenty seconds, both sides held", () => {
    expect(routineSeconds()).toBe(200);
  });
});

describe("the breath of a held pose", () => {
  it("goes a few degrees deeper on every exercise, never more", () => {
    for (const exercise of EXERCISES) {
      const breath = exercise.breath ?? {};
      expect(Object.keys(breath).length).toBeGreaterThan(0);
      for (const degrees of Object.values(breath)) {
        expect(Math.abs(degrees ?? 0)).toBeLessThanOrEqual(BREATH_MAX_DEGREES);
      }
    }
  });

  it("leaves the pose as it is without a breath", () => {
    expect(deepen(QUAD, {})).toEqual(QUAD);
  });

  it("keeps a foot on the floor and the head up at the bottom of a breath", () => {
    for (const exercise of EXERCISES) {
      const deep = deepen(exercise.pose, exercise.breath ?? {});
      const { footFar, footNear, head } = bones(deep);
      const floor = grounding(deep);
      const onFloor = (y: number) => Math.abs(y - floor) < 0.03;
      expect({
        key: exercise.key,
        foot:
          onFloor(footFar.from.y) ||
          onFloor(footFar.to.y) ||
          onFloor(footNear.from.y) ||
          onFloor(footNear.to.y),
      }).toEqual({ key: exercise.key, foot: true });
      expect(head.to.y).toBeLessThan(-LENGTH.torso * 0.6);
    }
  });

  it("moves the figure only a little: the hip rises or sinks by less than a tenth", () => {
    for (const exercise of EXERCISES) {
      const deep = deepen(exercise.pose, exercise.breath ?? {});
      expect(Math.abs(grounding(deep) - grounding(exercise.pose))).toBeLessThan(0.1);
    }
  });
});
