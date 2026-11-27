import { act, render, screen } from "@testing-library/react-native";

import { isMove } from "./allExercises";
import { NEW_EXERCISES } from "./exercisesMore";
import { POSE_MS } from "./Figure";
import { FigureFront } from "./FigureFront";
import { BREATH_MAX_DEGREES } from "./poses";
import {
  deepenFront,
  FRONT_LENGTH,
  FRONT_SEGMENTS,
  FRONT_STAND,
  type FrontBreath,
  frontBones,
  frontBox,
  frontDrift,
  frontGrounding,
  type FrontPose,
  frontSway,
  HIP_HALF,
  mirrorFront,
  mirrorFrontBreath,
} from "./posesFront";
import {
  ARM_OPENERS,
  ARM_OPENERS_MOVE,
  BUTTERFLY,
  BUTTERFLY_BREATH,
  FROG,
  FROG_BREATH,
  GOALPOST,
  HIP_CIRCLES,
  HIP_CIRCLES_MOVE,
  KNEE_SWAY,
  KNEE_SWAY_MOVE,
  LYING_TWIST,
  LYING_TWIST_BREATH,
  NECK_SIDE,
  NECK_TURN,
  NINETY_NINETY_ABOVE,
  NINETY_NINETY_ABOVE_BREATH,
  OPEN_BOOK,
  OPEN_BOOK_MOVE,
  SIDE_BEND,
  SIDE_BEND_BREATH,
  SIDE_LUNGE,
  SIDE_LUNGE_MOVE,
  SIDE_QUAD_ABOVE,
  SIDE_QUAD_ABOVE_BREATH,
  TRUNK_TURNS,
  TRUNK_TURNS_MOVE,
  WIDE_FOLD,
} from "./posesFrontMore";

const LEG = FRONT_LENGTH.thighLeft + FRONT_LENGTH.shinLeft;
/** How close counts as touching, in shares of the height. */
const ON = 0.02;

/** `pose` a share of the way along a breath or a movement. */
function along(pose: FrontPose, turn: FrontBreath, share: number): FrontPose {
  const part: Partial<Record<(typeof FRONT_SEGMENTS)[number], number>> = {};
  for (const segment of FRONT_SEGMENTS) {
    const degrees = turn[segment];
    if (degrees !== undefined) {
      part[segment] = degrees * share;
    }
  }
  return deepenFront(pose, part);
}

const QUARTERS = [0, 0.25, 0.5, 0.75, 1];
const fronts = NEW_EXERCISES.filter((exercise) => exercise.front !== undefined);

describe("the new poses seen from the front, on either side", () => {
  it("are sixteen, each with a breath or a movement of its own", () => {
    // Fourteen of the fourth block, and two holds of the second seen from above.
    expect(fronts).toHaveLength(16);
    for (const exercise of fronts) {
      const turns = Object.values(exercise.frontBreath ?? {});
      expect(turns.length).toBeGreaterThan(0);
      if (!isMove(exercise)) {
        for (const degrees of turns) {
          expect(Math.abs(degrees ?? 0)).toBeLessThanOrEqual(BREATH_MAX_DEGREES);
        }
      }
    }
  });

  it("stay whole on a narrow phone and in their box, all the way along", () => {
    for (const exercise of fronts) {
      const front = exercise.front as FrontPose;
      const turn = exercise.frontBreath ?? {};
      for (const [pose, way] of [
        [front, turn],
        [mirrorFront(front), mirrorFrontBreath(turn)],
      ] as const) {
        const slid = frontDrift(pose);
        const sway = frontSway(pose, deepenFront(pose, way));
        for (const share of isMove(exercise) ? QUARTERS : [0, 1]) {
          const { left, right, top, bottom } = frontBox(along(pose, way, share));
          const across = slid + sway * share;
          // Half a narrow phone is about half the figure's height.
          expect({ key: exercise.key, ok: right + across < 0.48 }).toEqual({
            key: exercise.key,
            ok: true,
          });
          expect({ key: exercise.key, ok: left + across > -0.48 }).toEqual({
            key: exercise.key,
            ok: true,
          });
          expect(bottom - top).toBeLessThan(1.1);
        }
      }
    }
  });

  it("stand or sit on the lowest point, never deeper than a leg, unless seen from above", () => {
    for (const exercise of fronts) {
      const front = exercise.front as FrontPose;
      const deep = deepenFront(front, exercise.frontBreath ?? {});
      for (const pose of [front, deep]) {
        if (pose.above === true) {
          // In the middle of its box: as much room above as below.
          const { top, bottom } = frontBox(pose);
          expect(frontGrounding(pose)).toBeCloseTo(
            bottom + (1 - (bottom - top)) / 2,
            6,
          );
        } else {
          expect(frontGrounding(pose)).toBeLessThanOrEqual(LEG + 0.001);
        }
      }
      if (!isMove(exercise)) {
        expect(Math.abs(frontGrounding(deep) - frontGrounding(front))).toBeLessThan(
          0.05,
        );
      }
    }
  });
});

describe("the new poses seen from the front, one by one", () => {
  it("tilt or lean only the head for the neck, standing as before", () => {
    for (const pose of [NECK_SIDE, NECK_TURN]) {
      expect(pose.torso).toBe(FRONT_STAND.torso);
      expect(pose.thighLeft).toBe(0);
      expect(pose.thighRight).toBe(0);
      // To the left of the screen.
      expect(frontBones(pose).head.to.x).toBeLessThan(0);
    }
    // The tilt shows; the turn only leans.
    expect(180 - NECK_SIDE.head).toBeGreaterThan(25);
    expect(180 - NECK_TURN.head).toBeLessThan(180 - NECK_SIDE.head);
  });

  it("raise the elbows to shoulder height for the goalpost, the hands above the head", () => {
    const { forearmLeft, forearmRight, head, upperArmLeft, upperArmRight } =
      frontBones(GOALPOST);
    for (const arm of [upperArmLeft, upperArmRight]) {
      expect(Math.abs(arm.to.y - arm.from.y)).toBeLessThan(0.02);
    }
    expect(upperArmLeft.to.x).toBeLessThan(-0.2);
    expect(upperArmRight.to.x).toBeGreaterThan(0.2);
    expect(forearmLeft.to.y).toBeLessThan(head.from.y);
    expect(forearmRight.to.y).toBeLessThan(head.from.y);
    // The same on both sides.
    expect(forearmLeft.to.x).toBeCloseTo(-forearmRight.to.x, 6);
  });

  it("lean to one side with the other arm over the head, both feet under the hips", () => {
    for (const pose of [SIDE_BEND, deepenFront(SIDE_BEND, SIDE_BEND_BREATH)]) {
      const { forearmRight, head, shinLeft, shinRight, torso } = frontBones(pose);
      expect(torso.to.x).toBeLessThan(-0.05);
      // The hand is higher than the head and past it, on the side it leans to.
      expect(forearmRight.to.y).toBeLessThan(head.to.y + 0.02);
      expect(forearmRight.to.x).toBeLessThan(head.to.x);
      expect(shinLeft.to.y).toBeCloseTo(LEG, 6);
      expect(shinRight.to.y).toBeCloseTo(LEG, 6);
    }
    const deep = frontBones(deepenFront(SIDE_BEND, SIDE_BEND_BREATH));
    expect(deep.torso.to.x).toBeLessThan(frontBones(SIDE_BEND).torso.to.x);
  });

  it("lie with the arms wide for the twist, both knees dropped to the same side", () => {
    expect(LYING_TWIST.above).toBe(true);
    const { forearmLeft, forearmRight, thighLeft, thighRight } =
      frontBones(LYING_TWIST);
    expect(forearmLeft.to.x).toBeLessThan(-0.3);
    expect(forearmRight.to.x).toBeGreaterThan(0.3);
    expect(thighLeft.to.x).toBeLessThan(-0.2);
    expect(thighRight.to.x).toBeLessThan(-0.15);
    const deep = frontBones(deepenFront(LYING_TWIST, LYING_TWIST_BREATH));
    expect(deep.thighRight.to.x).toBeLessThan(thighRight.to.x);
  });

  it("open the knees to the sides for the butterfly, the feet back by the middle and lower than the hip", () => {
    const { forearmLeft, shinLeft, shinRight, thighLeft, thighRight } =
      frontBones(BUTTERFLY);
    expect(thighLeft.to.x).toBeLessThan(-0.25);
    expect(thighRight.to.x).toBeGreaterThan(0.25);
    expect(Math.abs(shinLeft.to.x)).toBeLessThan(0.07);
    expect(Math.abs(shinRight.to.x)).toBeLessThan(0.07);
    expect(shinLeft.to.y).toBeGreaterThan(0.05);
    // Sitting: the head as high above the hip as when standing.
    expect(frontBones(BUTTERFLY).head.to.y).toBeCloseTo(
      -(FRONT_LENGTH.torso + FRONT_LENGTH.head),
      6,
    );
    // The hands are down by the shins.
    expect(forearmLeft.to.y).toBeGreaterThan(-0.05);
    // On a breath the knees go down, the feet stay about where they are.
    const deep = frontBones(deepenFront(BUTTERFLY, BUTTERFLY_BREATH));
    expect(deep.thighLeft.to.y).toBeGreaterThan(thighLeft.to.y);
    expect(Math.abs(deep.shinLeft.to.x - shinLeft.to.x)).toBeLessThan(0.05);
  });

  it("spread the knees wide for the frog, the shins straight back, the hips pushed back on a breath", () => {
    expect(FROG.above).toBe(true);
    const { forearmLeft, shinLeft, thighLeft, thighRight } = frontBones(FROG);
    expect(thighLeft.to.x).toBeLessThan(-0.25);
    expect(thighRight.to.x).toBeGreaterThan(0.25);
    expect(Math.abs(shinLeft.to.x - thighLeft.to.x)).toBeLessThan(0.03);
    expect(shinLeft.to.y).toBeGreaterThan(thighLeft.to.y + 0.2);
    // The arms are forward, past the head's start.
    expect(forearmLeft.to.y).toBeLessThan(-0.4);
    // Hips back: the knees end up further toward the head than the hip.
    const deep = frontBones(deepenFront(FROG, FROG_BREATH));
    expect(deep.thighLeft.to.y).toBeLessThan(thighLeft.to.y);
    expect(deep.thighLeft.to.y).toBeLessThan(0);
  });

  it("hang the body between wide legs for the fold, the hands on the floor", () => {
    const { forearmLeft, forearmRight, head, shinLeft, shinRight } =
      frontBones(WIDE_FOLD);
    const floor = frontGrounding(WIDE_FOLD);
    expect(shinLeft.to.x).toBeLessThan(-0.2);
    expect(shinRight.to.x).toBeGreaterThan(0.2);
    expect(shinLeft.to.y).toBeCloseTo(shinRight.to.y, 6);
    // The head is below the hip, by the floor; nothing is under it.
    expect(head.to.y).toBeGreaterThan(0.35);
    expect(floor - shinLeft.to.y).toBeLessThan(ON);
    expect(floor - forearmLeft.to.y).toBeLessThan(ON);
    expect(floor - forearmRight.to.y).toBeLessThan(ON);
  });
});

describe("the side lunge, a movement with both feet planted", () => {
  const lunge = deepenFront(SIDE_LUNGE, SIDE_LUNGE_MOVE);

  it("keeps the feet as far apart as they were, both on the floor", () => {
    const before = frontBones(SIDE_LUNGE);
    const after = frontBones(lunge);
    expect(after.shinRight.to.x - after.shinLeft.to.x).toBeCloseTo(
      before.shinRight.to.x - before.shinLeft.to.x,
      2,
    );
    expect(after.shinLeft.to.y).toBeCloseTo(after.shinRight.to.y, 2);
    expect(frontGrounding(lunge)).toBeLessThan(frontGrounding(SIDE_LUNGE) - 0.05);
  });

  it("bends one knee out over its foot and keeps the other leg straight", () => {
    const { shinLeft, thighLeft } = frontBones(lunge);
    expect(lunge.shinRight).toBeCloseTo(lunge.thighRight, 6);
    expect(thighLeft.to.x).toBeLessThan(shinLeft.to.x);
    expect(thighLeft.to.y).toBeLessThan(shinLeft.to.y);
  });

  it("takes the hip across over the feet: as far as they would have slid, the other way", () => {
    expect(SIDE_LUNGE.planted).toBe(true);
    const middle = (pose: FrontPose) =>
      (frontBones(pose).shinLeft.to.x + frontBones(pose).shinRight.to.x) / 2;
    const sway = frontSway(SIDE_LUNGE, lunge);
    expect(sway).toBeCloseTo(middle(SIDE_LUNGE) - middle(lunge), 6);
    // Toward the bent knee, on the left of the screen.
    expect(sway).toBeLessThan(-0.05);
    // With the hip moved, the feet are where they began.
    expect(frontBones(lunge).shinLeft.to.x + sway).toBeCloseTo(
      frontBones(SIDE_LUNGE).shinLeft.to.x,
      2,
    );
    // The other side goes the other way; a pose not planted does not move.
    const other = mirrorFront(SIDE_LUNGE);
    expect(other.planted).toBe(true);
    expect(
      frontSway(other, deepenFront(other, mirrorFrontBreath(SIDE_LUNGE_MOVE))),
    ).toBeCloseTo(-sway, 6);
    expect(frontSway(SIDE_BEND, deepenFront(SIDE_BEND, SIDE_BEND_BREATH))).toBe(0);
    expect(HIP_HALF).toBeGreaterThan(0);
  });

  it("is drawn moving, on either side", async () => {
    jest.useFakeTimers();
    try {
      const { rerender } = await render(
        <FigureFront
          pose={SIDE_LUNGE}
          breath={SIDE_LUNGE_MOVE}
          breathing
          breathMs={4000}
          height={300}
          testID="lunge"
        />,
      );
      await act(() => jest.advanceTimersByTimeAsync(5000));
      await rerender(
        <FigureFront
          pose={SIDE_LUNGE}
          breath={SIDE_LUNGE_MOVE}
          breathing
          breathMs={4000}
          height={300}
          mirrored
          testID="lunge"
        />,
      );
      await act(() => jest.advanceTimersByTimeAsync(POSE_MS * 3));
      expect(screen.getByTestId("lunge", { includeHiddenElements: true })).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("the five movements that go toward whoever looks", () => {
  /** The same pose, give or take a rounding of the directions. */
  function expectSame(a: FrontPose, b: FrontPose): void {
    for (const segment of FRONT_SEGMENTS) {
      const turn = (((a[segment] - b[segment]) % 360) + 540) % 360;
      expect(Math.abs(turn - 180)).toBeLessThan(0.2);
    }
  }

  it("opens the arms from a hug, the hands going straight across at shoulder height", () => {
    const hug = frontBones(ARM_OPENERS);
    // Each hand by the other shoulder.
    expect(hug.forearmLeft.to.x).toBeGreaterThan(0.04);
    expect(hug.forearmRight.to.x).toBeLessThan(-0.04);
    expect(
      Math.hypot(
        hug.forearmLeft.to.x - hug.upperArmRight.from.x,
        hug.forearmLeft.to.y - hug.upperArmRight.from.y,
      ),
    ).toBeLessThan(0.07);
    const open = frontBones(deepenFront(ARM_OPENERS, ARM_OPENERS_MOVE));
    expect(open.forearmLeft.to.x).toBeLessThan(-0.35);
    expect(open.forearmRight.to.x).toBeGreaterThan(0.35);
    let last = hug.forearmLeft.to.x;
    for (const share of QUARTERS) {
      const b = frontBones(along(ARM_OPENERS, ARM_OPENERS_MOVE, share));
      // Never lower than the chest, never above the head; always outward.
      expect(Math.abs(b.forearmLeft.to.y - b.upperArmLeft.from.y)).toBeLessThan(0.1);
      expect(b.forearmLeft.to.x).toBeLessThanOrEqual(last);
      last = b.forearmLeft.to.x;
      // The same on both sides, and nothing else moves.
      expect(b.forearmRight.to.x).toBeCloseTo(-b.forearmLeft.to.x, 6);
      expect(b.shinLeft.to.y).toBeCloseTo(LEG, 6);
    }
  });

  it("opens the top arm like a book, seen from above: the knees and the other arm stay", () => {
    expect(OPEN_BOOK.above).toBe(true);
    const shut = frontBones(OPEN_BOOK);
    const open = frontBones(deepenFront(OPEN_BOOK, OPEN_BOOK_MOVE));
    // Both knees and both hands to the left of the screen, then one hand across.
    expect(shut.thighLeft.to.x).toBeLessThan(-0.2);
    expect(shut.thighRight.to.x).toBeLessThan(-0.15);
    expect(shut.forearmLeft.to.x).toBeLessThan(-0.3);
    expect(shut.forearmRight.to.x).toBeLessThan(-0.2);
    expect(open.forearmRight.to.x).toBeGreaterThan(0.35);
    expect(Object.keys(OPEN_BOOK_MOVE).sort()).toEqual([
      "forearmRight",
      "head",
      "upperArmRight",
    ]);
    // The head follows the hand.
    expect(open.head.to.x).toBeGreaterThan(shut.head.to.x);
    let last = shut.forearmRight.to.x;
    for (const share of QUARTERS) {
      const b = frontBones(along(OPEN_BOOK, OPEN_BOOK_MOVE, share));
      expect(Math.abs(b.forearmRight.to.y - b.upperArmRight.from.y)).toBeLessThan(0.05);
      expect(b.forearmRight.to.x).toBeGreaterThanOrEqual(last);
      last = b.forearmRight.to.x;
    }
  });

  it("swings the arms from one side to the other for the trunk turns, the feet wide and still", () => {
    const end = deepenFront(TRUNK_TURNS, TRUNK_TURNS_MOVE);
    expectSame(end, mirrorFront(TRUNK_TURNS));
    const b = frontBones(TRUNK_TURNS);
    expect(TRUNK_TURNS.torso).toBe(FRONT_STAND.torso);
    expect(b.shinRight.to.x - b.shinLeft.to.x).toBeGreaterThan(0.25);
    // Both hands to the right of the screen, then both to the left.
    expect(b.forearmLeft.to.x).toBeGreaterThan(0.05);
    expect(b.forearmRight.to.x).toBeGreaterThan(0.3);
    expect(frontBones(end).forearmRight.to.x).toBeLessThan(-0.05);
    for (const segment of [
      "thighLeft",
      "shinLeft",
      "thighRight",
      "shinRight",
    ] as const) {
      expect(TRUNK_TURNS_MOVE[segment]).toBeUndefined();
    }
  });

  it("sways both knees from one side to the other, seen from above, the feet ending where they began", () => {
    expect(KNEE_SWAY.above).toBe(true);
    const end = deepenFront(KNEE_SWAY, KNEE_SWAY_MOVE);
    expectSame(end, mirrorFront(KNEE_SWAY));
    const before = frontBones(KNEE_SWAY);
    const after = frontBones(end);
    for (const shin of ["shinLeft", "shinRight"] as const) {
      expect(after[shin].to.x).toBeCloseTo(before[shin].to.x, 2);
      expect(after[shin].to.y).toBeCloseTo(before[shin].to.y, 2);
    }
    expect(before.shinRight.to.x - before.shinLeft.to.x).toBeGreaterThan(0.3);
    // Each knee is to the right of the line from its hip to its foot, then
    // to the left of it.
    const off = (b: typeof before, thigh: "thighLeft" | "thighRight") => {
      const shin = thigh === "thighLeft" ? "shinLeft" : "shinRight";
      const { from, to: knee } = b[thigh];
      const foot = b[shin].to;
      const share = (knee.y - from.y) / (foot.y - from.y);
      return knee.x - (from.x + (foot.x - from.x) * share);
    };
    for (const thigh of ["thighLeft", "thighRight"] as const) {
      expect(off(before, thigh)).toBeGreaterThan(0.08);
      expect(off(after, thigh)).toBeLessThan(-0.08);
    }
    // The bars cannot shorten as a knee comes up: half way the legs are
    // straight and the feet a little further, never by much.
    for (const share of QUARTERS) {
      const b = frontBones(along(KNEE_SWAY, KNEE_SWAY_MOVE, share));
      expect(
        Math.hypot(
          b.shinLeft.to.x - before.shinLeft.to.x,
          b.shinLeft.to.y - before.shinLeft.to.y,
        ),
      ).toBeLessThan(0.07);
    }
  });

  it("takes the hips from one side to the other over feet that stay in the middle, the hands on them", () => {
    expect(HIP_CIRCLES.planted).toBe(true);
    const end = deepenFront(HIP_CIRCLES, HIP_CIRCLES_MOVE);
    expectSame(end, mirrorFront(HIP_CIRCLES));
    const middle = (pose: FrontPose) =>
      (frontBones(pose).shinLeft.to.x + frontBones(pose).shinRight.to.x) / 2;
    // It begins with the hip to the right of the feet, and is drawn there.
    expect(middle(HIP_CIRCLES)).toBeCloseTo(-0.05, 2);
    expect(frontDrift(HIP_CIRCLES)).toBeCloseTo(0.05, 2);
    const sway = frontSway(HIP_CIRCLES, end);
    expect(sway).toBeCloseTo(-0.1, 2);
    const floor = frontGrounding(HIP_CIRCLES);
    expect(frontGrounding(end)).toBeCloseTo(floor, 2);
    for (const share of QUARTERS) {
      const pose = along(HIP_CIRCLES, HIP_CIRCLES_MOVE, share);
      const b = frontBones(pose);
      const across = frontDrift(HIP_CIRCLES) + sway * share;
      // The feet: in the middle of the screen, apart, on the floor.
      expect(Math.abs(middle(pose) + across)).toBeLessThan(0.005);
      expect(b.shinRight.to.x - b.shinLeft.to.x).toBeCloseTo(0.32, 1);
      expect(Math.abs(b.shinLeft.to.y - floor)).toBeLessThan(ON);
      expect(Math.abs(b.shinRight.to.y - floor)).toBeLessThan(ON);
      // The hands: on the hips.
      expect(
        Math.hypot(b.forearmLeft.to.x + HIP_HALF, b.forearmLeft.to.y),
      ).toBeLessThan(0.05);
      expect(
        Math.hypot(b.forearmRight.to.x - HIP_HALF, b.forearmRight.to.y),
      ).toBeLessThan(0.05);
    }
    // The body leans back over the feet: the head stays near the middle.
    expect(
      Math.abs(frontBones(HIP_CIRCLES).head.to.x + frontDrift(HIP_CIRCLES)),
    ).toBeLessThan(0.03);
  });

  it("are drawn moving", async () => {
    jest.useFakeTimers();
    try {
      for (const [pose, move] of [
        [HIP_CIRCLES, HIP_CIRCLES_MOVE],
        [KNEE_SWAY, KNEE_SWAY_MOVE],
        [ARM_OPENERS, ARM_OPENERS_MOVE],
      ] as const) {
        const { unmount } = await render(
          <FigureFront
            pose={pose}
            breath={move}
            breathing
            breathMs={3000}
            height={300}
            testID="moving"
          />,
        );
        await act(() => jest.advanceTimersByTimeAsync(4000));
        expect(
          screen.getByTestId("moving", { includeHiddenElements: true }),
        ).toBeTruthy();
        await unmount();
      }
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("two holds of the second block, seen from above", () => {
  it("bends both knees at right angles for the 90/90, one thigh forward and one to the side", () => {
    expect(NINETY_NINETY_ABOVE.above).toBe(true);
    const turn = (a: number, b: number) =>
      Math.abs(((((a - b) % 360) + 540) % 360) - 180);
    // Each knee, and the two thighs with each other.
    expect(
      turn(NINETY_NINETY_ABOVE.thighLeft, NINETY_NINETY_ABOVE.shinLeft),
    ).toBeCloseTo(90, 0);
    expect(
      turn(NINETY_NINETY_ABOVE.thighRight, NINETY_NINETY_ABOVE.shinRight),
    ).toBeCloseTo(90, 0);
    expect(
      turn(NINETY_NINETY_ABOVE.thighLeft, NINETY_NINETY_ABOVE.thighRight),
    ).toBeGreaterThan(85);
    const { shinLeft, shinRight, thighLeft, thighRight, torso } =
      frontBones(NINETY_NINETY_ABOVE);
    // The front knee is forward of the hip (down the screen), its shin across.
    expect(thighLeft.to.y).toBeGreaterThan(0.2);
    expect(shinLeft.to.x).toBeGreaterThan(thighLeft.to.x + 0.2);
    // The other knee is out to the side, its foot back by the body.
    expect(thighRight.to.x).toBeGreaterThan(0.25);
    expect(shinRight.to.y).toBeLessThan(-0.15);
    // On a breath the chest goes a little toward the front knee.
    const deep = frontBones(
      deepenFront(NINETY_NINETY_ABOVE, NINETY_NINETY_ABOVE_BREATH),
    );
    expect(deep.torso.to.x).toBeLessThan(torso.to.x);
    expect(deep.shinLeft.to.x).toBeCloseTo(shinLeft.to.x, 6);
  });

  it("holds the top foot by the glutes for the side-lying quad, the lower leg long", () => {
    expect(SIDE_QUAD_ABOVE.above).toBe(true);
    const deep = deepenFront(SIDE_QUAD_ABOVE, SIDE_QUAD_ABOVE_BREATH);
    const far = (pose: FrontPose) =>
      Math.hypot(...Object.values(frontBones(pose).shinRight.to));
    for (const pose of [SIDE_QUAD_ABOVE, deep]) {
      const { forearmLeft, forearmRight, head, shinLeft, shinRight } = frontBones(pose);
      // The hand is on the foot, and the foot back up by the hip.
      expect(
        Math.hypot(
          forearmRight.to.x - shinRight.to.x,
          forearmRight.to.y - shinRight.to.y,
        ),
      ).toBeLessThan(ON);
      expect(far(pose)).toBeLessThan(0.2);
      // The lower leg is straight, the head on the lower arm.
      expect(shinLeft.to.y).toBeGreaterThan(LEG - 0.01);
      expect(Math.abs(forearmLeft.to.y - head.to.y)).toBeLessThan(0.03);
    }
    expect(far(deep)).toBeLessThan(far(SIDE_QUAD_ABOVE));
  });
});
