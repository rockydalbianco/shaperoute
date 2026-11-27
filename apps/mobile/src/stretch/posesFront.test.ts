import {
  deepenFront,
  FRONT_LENGTH,
  FRONT_PARENT,
  FRONT_REACH,
  FRONT_SEGMENTS,
  FRONT_STAND,
  frontBones,
  frontBox,
  frontDrift,
  frontGrounding,
  type FrontPose,
  HIP_HALF,
  mirrorFront,
  mirrorFrontBreath,
  SHOULDER_HALF,
  sideOf,
} from "./posesFront";

/** A side bend: the torso and the head lean to the left of the screen. */
const SIDE_BEND: FrontPose = {
  ...FRONT_STAND,
  torso: 160,
  head: 150,
  upperArmRight: 150,
  forearmRight: 140,
};

/** Lying on the back seen from above, both knees dropped to the right. */
const LYING: FrontPose = {
  ...FRONT_STAND,
  above: true,
  upperArmLeft: 90,
  forearmLeft: 90,
  upperArmRight: -90,
  forearmRight: -90,
  thighLeft: -70,
  shinLeft: 20,
  thighRight: -70,
  shinRight: 20,
};

describe("the figure seen from the front", () => {
  it("gives every segment a length and a place to hang from", () => {
    for (const segment of FRONT_SEGMENTS) {
      expect(FRONT_LENGTH[segment]).toBeGreaterThan(0);
      const parent = FRONT_PARENT[segment];
      expect(parent === null || FRONT_SEGMENTS.includes(parent)).toBe(true);
    }
  });

  it("stands on both feet, a leg below the hip, the same height as from the side", () => {
    const b = frontBones(FRONT_STAND);
    const leg = FRONT_LENGTH.thighLeft + FRONT_LENGTH.shinLeft;
    expect(b.shinLeft.to.y).toBeCloseTo(leg);
    expect(b.shinRight.to.y).toBeCloseTo(leg);
    expect(frontGrounding(FRONT_STAND)).toBeCloseTo(leg);
    const { top, bottom } = frontBox(FRONT_STAND);
    expect(bottom - top).toBeCloseTo(leg + FRONT_LENGTH.torso + FRONT_LENGTH.head);
  });

  it("draws the left limbs on the left of the screen and the right ones on the right", () => {
    const b = frontBones(FRONT_STAND);
    expect(b.thighLeft.from.x).toBeCloseTo(-HIP_HALF);
    expect(b.thighRight.from.x).toBeCloseTo(HIP_HALF);
    expect(b.upperArmLeft.from.x).toBeCloseTo(-SHOULDER_HALF);
    expect(b.upperArmRight.from.x).toBeCloseTo(SHOULDER_HALF);
    expect(b.upperArmLeft.from.y).toBeLessThan(0);
    for (const segment of FRONT_SEGMENTS) {
      const side = sideOf(segment);
      if (side !== 0) {
        expect(Math.sign(b[segment].to.x)).toBe(side);
      }
    }
  });

  it("points 90 to the left of the screen and -90 to the right", () => {
    const b = frontBones({ ...FRONT_STAND, upperArmLeft: 90, upperArmRight: -90 });
    expect(b.upperArmLeft.to.x).toBeCloseTo(-SHOULDER_HALF - FRONT_LENGTH.upperArmLeft);
    expect(b.upperArmLeft.to.y).toBeCloseTo(b.upperArmLeft.from.y);
    expect(b.upperArmRight.to.x).toBeCloseTo(
      SHOULDER_HALF + FRONT_LENGTH.upperArmRight,
    );
  });

  it("carries the shoulders with the torso when it leans", () => {
    const b = frontBones(SIDE_BEND);
    // Leaning to the left, the head is left of the hip and the left
    // shoulder lower than the right one.
    expect(b.head.to.x).toBeLessThan(-0.05);
    expect(b.upperArmLeft.from.y).toBeGreaterThan(b.upperArmRight.from.y);
    const across = Math.hypot(
      b.upperArmRight.from.x - b.upperArmLeft.from.x,
      b.upperArmRight.from.y - b.upperArmLeft.from.y,
    );
    expect(across).toBeCloseTo(2 * SHOULDER_HALF);
  });

  it("keeps the feet on the floor in a side bend and the figure in its box", () => {
    expect(frontGrounding(SIDE_BEND)).toBeCloseTo(frontGrounding(FRONT_STAND));
    const { left, right } = frontBox(SIDE_BEND);
    expect(-left).toBeLessThanOrEqual(FRONT_REACH);
    expect(right).toBeLessThanOrEqual(FRONT_REACH);
    expect(frontDrift(SIDE_BEND)).toBeCloseTo(0);
  });

  it("lies in the middle of its box when seen from above", () => {
    const { top, bottom } = frontBox(LYING);
    const free = 1 - (bottom - top);
    expect(free).toBeGreaterThan(0);
    expect(frontGrounding(LYING)).toBeCloseTo(bottom + free / 2);
  });

  it("slides back only when a pose reaches past the edge", () => {
    const wide: FrontPose = {
      ...FRONT_STAND,
      upperArmLeft: 90,
      forearmLeft: 90,
      thighLeft: 80,
      shinLeft: 80,
    };
    const { left } = frontBox(wide);
    expect(-left).toBeGreaterThan(FRONT_REACH);
    expect(frontDrift(wide)).toBeCloseTo(-left - FRONT_REACH);
    expect(frontDrift(FRONT_STAND)).toBeCloseTo(0);
  });

  it("draws a planted pose with its feet in the middle, wherever the hip is", () => {
    // The hip to the right of two feet that are apart.
    const across: FrontPose = {
      ...FRONT_STAND,
      thighLeft: 30,
      shinLeft: 30,
      thighRight: -5,
      shinRight: -5,
    };
    const b = frontBones(across);
    const feet = (b.shinLeft.to.x + b.shinRight.to.x) / 2;
    expect(feet).toBeLessThan(-0.05);
    expect(frontDrift(across)).toBeCloseTo(0);
    expect(frontDrift({ ...across, planted: true })).toBeCloseTo(-feet);
    expect(frontDrift({ ...FRONT_STAND, planted: true })).toBeCloseTo(0);
  });
});

describe("the other side, seen from the front", () => {
  it("mirrors a pose: what leaned left leans right by as much", () => {
    const one = frontBones(SIDE_BEND);
    const other = frontBones(mirrorFront(SIDE_BEND));
    expect(other.head.to.x).toBeCloseTo(-one.head.to.x);
    expect(other.head.to.y).toBeCloseTo(one.head.to.y);
    expect(other.forearmLeft.to.x).toBeCloseTo(-one.forearmRight.to.x);
    expect(other.forearmLeft.to.y).toBeCloseTo(one.forearmRight.to.y);
  });

  it("gives the same pose back when mirrored twice, and keeps «from above»", () => {
    const twice = mirrorFront(mirrorFront(LYING));
    for (const segment of FRONT_SEGMENTS) {
      expect(twice[segment]).toBeCloseTo(LYING[segment]);
    }
    expect(twice.above).toBe(true);
    expect(mirrorFront(FRONT_STAND).torso).toBe(180);
  });

  it("mirrors a breath with its pose: the deepest point is the mirror of the deepest", () => {
    const breath = { torso: -8, head: -10, upperArmRight: 6 };
    const deep = frontBones(deepenFront(SIDE_BEND, breath));
    const mirrored = frontBones(
      deepenFront(mirrorFront(SIDE_BEND), mirrorFrontBreath(breath)),
    );
    expect(mirrored.head.to.x).toBeCloseTo(-deep.head.to.x);
    expect(mirrored.forearmLeft.to.x).toBeCloseTo(-deep.forearmRight.to.x);
    expect(mirrorFrontBreath({})).toEqual({});
  });
});
