import { EXERCISES, MORE_EXERCISES, routineSeconds, SIDE_SECONDS } from "./exercises";
import {
  bones,
  BREATH_MAX_DEGREES,
  CALF,
  CAT,
  CHEST,
  CHILD,
  deepen,
  FORWARD_FOLD,
  GLUTE,
  grounding,
  HAMSTRING,
  HIP_FLEXOR,
  KNEE_HUG,
  LENGTH,
  NECK,
  OVERHEAD_REACH,
  type Pose,
  QUAD,
  SEGMENTS,
  SHOULDER,
  span,
  STAND,
  TRICEPS,
  UPPER_BACK,
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

describe("the ten stretches of the routines", () => {
  const ALL = [...EXERCISES, ...MORE_EXERCISES];

  it("are ten more, fifteen in all, each with a name, a line, a pose and a breath", () => {
    expect(MORE_EXERCISES).toHaveLength(10);
    expect(new Set(ALL.map((e) => e.key)).size).toBe(15);
    for (const exercise of MORE_EXERCISES) {
      expect(exercise.name.length).toBeGreaterThan(0);
      expect(exercise.howTo.length).toBeGreaterThan(0);
      expect(SEGMENTS.every((s) => typeof exercise.pose[s] === "number")).toBe(true);
      const breath = Object.values(exercise.breath ?? {});
      expect(breath.length).toBeGreaterThan(0);
      for (const degrees of breath) {
        expect(Math.abs(degrees ?? 0)).toBeLessThanOrEqual(BREATH_MAX_DEGREES);
      }
    }
  });

  it("stand on the floor, never below it, and fit the box, at rest and deepest", () => {
    for (const exercise of MORE_EXERCISES) {
      const deep = deepen(exercise.pose, exercise.breath ?? {});
      for (const pose of [exercise.pose, deep]) {
        const { back, front } = span(pose);
        expect(front - back).toBeLessThan(1.1);
        expect(grounding(pose)).toBeLessThanOrEqual(
          LENGTH.thighFar + LENGTH.shinFar + 0.001,
        );
      }
      expect(Math.abs(grounding(deep) - grounding(exercise.pose))).toBeLessThan(0.1);
    }
  });

  it("keep the standing ones on both feet, the head up", () => {
    for (const pose of [NECK, OVERHEAD_REACH, SHOULDER, CHEST, TRICEPS, UPPER_BACK]) {
      const { footFar, footNear, head } = bones(pose);
      expect(footFar.from.y).toBeCloseTo(grounding(STAND), 6);
      expect(footNear.from.y).toBeCloseTo(grounding(STAND), 6);
      expect(head.to.y).toBeLessThan(-LENGTH.torso * 0.6);
    }
  });

  it("drop the chin for the neck and raise the hands over the head to reach", () => {
    expect(bones(NECK).head.to.x).toBeGreaterThan(bones(STAND).head.to.x + 0.05);
    const reach = bones(OVERHEAD_REACH);
    expect(reach.forearmNear.to.y).toBeLessThan(reach.head.to.y);
  });

  it("fold the hands down near the toes, never through the floor", () => {
    const { forearmNear } = bones(FORWARD_FOLD);
    expect(forearmNear.to.y).toBeGreaterThan(grounding(STAND) - 0.1);
    expect(forearmNear.to.y).toBeLessThanOrEqual(grounding(FORWARD_FOLD));
  });

  it("put hands and knees on the floor for the cat", () => {
    const { forearmNear, thighNear } = bones(CAT);
    const floor = grounding(CAT);
    expect(Math.abs(forearmNear.to.y - floor)).toBeLessThan(0.02);
    expect(Math.abs(thighNear.to.y - floor)).toBeLessThan(0.02);
  });

  it("sits the child's pose low, hands and knees down, the head over the floor", () => {
    const { forearmNear, thighNear, head } = bones(CHILD);
    const floor = grounding(CHILD);
    // Sat on the heels: the hip far lower than kneeling up.
    expect(floor).toBeLessThan(grounding(HIP_FLEXOR) * 0.6);
    expect(Math.abs(forearmNear.to.y - floor)).toBeLessThan(0.02);
    expect(Math.abs(thighNear.to.y - floor)).toBeLessThan(0.02);
    // The round head, about as wide as it is long, stays above the floor.
    expect(head.from.y + LENGTH.head / 2).toBeLessThanOrEqual(floor + 0.01);
  });

  it("hugs the near knee up with both hands at the shin", () => {
    const { thighNear, forearmNear } = bones(KNEE_HUG);
    expect(thighNear.to.y).toBeLessThan(-0.1);
    expect(Math.abs(forearmNear.to.x - thighNear.to.x)).toBeLessThan(0.05);
    expect(Math.abs(forearmNear.to.y - thighNear.to.y)).toBeLessThan(0.08);
  });

  it("takes the triceps elbow up by the head, the hand behind it", () => {
    const { upperArmNear, forearmNear, head } = bones(TRICEPS);
    expect(upperArmNear.to.y).toBeLessThan(head.from.y);
    expect(forearmNear.to.x).toBeLessThan(0);
  });
});
