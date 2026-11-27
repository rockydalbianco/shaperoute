import { NEW_EXERCISES } from "./exercisesMore";
import {
  bones,
  deepen,
  drift,
  grounding,
  LENGTH,
  type Pose,
  span,
  STAND,
} from "./poses";
import {
  BICEPS_WALL,
  CHAIR_FIGURE_FOUR,
  DEEP_SQUAT,
  DOORWAY_CHEST,
  DOWN_DOG,
  FIGURE_FOUR,
  FIGURE_FOUR_BREATH,
  HALF_SPLIT,
  LEGS_UP_WALL,
  LEGS_UP_WALL_BREATH,
  LIZARD,
  LYING_HAMSTRING,
  LYING_HAMSTRING_BREATH,
  NINETY_NINETY,
  PIGEON,
  PIGEON_BREATH,
  REST_BREATH,
  REST_BREATH_BREATH,
  SEATED_FOLD,
  SEATED_TWIST,
  SHIN_STRETCH,
  SIDE_QUAD,
  SIDE_QUAD_BREATH,
  SIDE_REACH_CHILD,
  SOLEUS,
  SPHINX,
  THREAD_NEEDLE,
  TOE_STRETCH,
  WRIST_EXTENSOR,
  WRIST_FLEXOR,
} from "./posesMore";

const LEG = LENGTH.thighFar + LENGTH.shinFar;
/** How close to the floor counts as on it, in shares of the height. */
const ON = 0.02;

/** How far above the floor a point at `y` is, in `pose`. */
function above(pose: Pose, y: number): number {
  return grounding(pose) - y;
}

describe("the new poses, at rest and at the bottom of a breath", () => {
  it("stand on the floor, never below it, and fit the box", () => {
    for (const exercise of NEW_EXERCISES) {
      const deep = deepen(exercise.pose, exercise.breath ?? {});
      for (const pose of [exercise.pose, deep]) {
        const { back, front } = span(pose);
        expect(front - back).toBeLessThan(1.1);
        expect(grounding(pose)).toBeLessThanOrEqual(LEG + 0.001);
      }
      expect(Math.abs(grounding(deep) - grounding(exercise.pose))).toBeLessThan(0.1);
    }
  });

  it("stay whole on a narrow phone, sliding back when they reach far", () => {
    for (const exercise of NEW_EXERCISES) {
      const slid = drift(exercise.pose);
      for (const pose of [
        exercise.pose,
        deepen(exercise.pose, exercise.breath ?? {}),
      ]) {
        const { back, front } = span(pose);
        // Half a narrow phone is about half the figure's height.
        expect({ key: exercise.key, ok: front - slid < 0.48 }).toEqual({
          key: exercise.key,
          ok: true,
        });
        expect({ key: exercise.key, ok: back - slid > -0.48 }).toEqual({
          key: exercise.key,
          ok: true,
        });
      }
    }
  });
});

describe("the new poses standing", () => {
  it("keep both feet flat where they stand and the head up, for the arms and the wrists", () => {
    for (const pose of [WRIST_FLEXOR, WRIST_EXTENSOR, BICEPS_WALL]) {
      const { footFar, footNear, head } = bones(pose);
      expect(footFar.from.y).toBeCloseTo(grounding(STAND), 6);
      expect(footNear.from.y).toBeCloseTo(grounding(STAND), 6);
      expect(head.to.y).toBeLessThan(-LENGTH.torso * 0.6);
    }
  });

  it("hold one arm forward for the wrists and straight back for the biceps", () => {
    for (const pose of [WRIST_FLEXOR, WRIST_EXTENSOR]) {
      const { forearmNear, forearmFar } = bones(pose);
      expect(forearmNear.to.x).toBeGreaterThan(0.25);
      // The other hand is at that hand, to pull or to press.
      expect(Math.abs(forearmFar.to.x - forearmNear.to.x)).toBeLessThan(0.06);
      expect(Math.abs(forearmFar.to.y - forearmNear.to.y)).toBeLessThan(0.06);
    }
    const { forearmNear, torso } = bones(BICEPS_WALL);
    expect(forearmNear.to.x).toBeLessThan(-0.25);
    expect(Math.abs(forearmNear.to.y - torso.to.y)).toBeLessThan(0.05);
  });

  it("step with both feet on the floor at the door and for the calf, knees bent for the calf", () => {
    for (const pose of [DOORWAY_CHEST, SOLEUS]) {
      const { footFar, footNear, shinFar, shinNear } = bones(pose);
      expect(above(pose, footFar.from.y)).toBeLessThan(ON);
      expect(above(pose, footNear.from.y)).toBeLessThan(ON);
      // One foot in front of the hip and one behind it.
      expect(shinNear.to.x).toBeGreaterThan(0);
      expect(shinFar.to.x).toBeLessThan(0);
    }
    // The hip is lower than standing: both knees are bent.
    expect(grounding(SOLEUS)).toBeLessThan(LEG - 0.05);
    const door = bones(DOORWAY_CHEST);
    // The elbow behind at shoulder height, the forearm up.
    expect(door.upperArmNear.to.x).toBeLessThan(-0.1);
    expect(door.forearmNear.to.y).toBeLessThan(door.upperArmNear.to.y - 0.1);
  });

  it("sink the squat low on both feet, the head still above the hip", () => {
    const { footFar, footNear, head, thighNear } = bones(DEEP_SQUAT);
    expect(above(DEEP_SQUAT, footFar.from.y)).toBeLessThan(ON);
    expect(above(DEEP_SQUAT, footNear.from.y)).toBeLessThan(ON);
    expect(grounding(DEEP_SQUAT)).toBeLessThan(0.2);
    // The hip is under the knees.
    expect(thighNear.to.y).toBeLessThan(0);
    expect(head.to.y).toBeLessThan(-LENGTH.torso * 0.6);
  });
});

describe("the new poses sitting and on the floor", () => {
  it("sit on a chair for the figure four: a shin above the floor, the ankle on the knee", () => {
    const { footFar, shinNear, thighFar } = bones(CHAIR_FIGURE_FOUR);
    expect(grounding(CHAIR_FIGURE_FOUR)).toBeCloseTo(LENGTH.shinFar, 6);
    expect(above(CHAIR_FIGURE_FOUR, footFar.from.y)).toBeLessThan(ON);
    const knee = thighFar.to;
    expect(Math.hypot(shinNear.to.x - knee.x, shinNear.to.y - knee.y)).toBeLessThan(
      0.03,
    );
  });

  it("kneel with a knee on the floor to thread the needle, for the child and the lizard", () => {
    for (const pose of [THREAD_NEEDLE, SIDE_REACH_CHILD, LIZARD]) {
      const { thighFar, shinFar } = bones(pose);
      expect(above(pose, thighFar.to.y)).toBeLessThan(ON);
      // The shin lies on the floor behind the knee.
      expect(above(pose, shinFar.to.y)).toBeLessThan(ON);
      expect(shinFar.to.x).toBeLessThan(thighFar.to.x);
    }
  });

  it("bring the head down by the floor to thread the needle, the far arm back under the body", () => {
    const { head, forearmFar, forearmNear, torso } = bones(THREAD_NEEDLE);
    expect(above(THREAD_NEEDLE, head.to.y)).toBeLessThan(0.12);
    expect(forearmFar.to.x).toBeLessThan(torso.to.x);
    expect(forearmNear.to.x).toBeGreaterThan(torso.to.x);
    expect(above(THREAD_NEEDLE, forearmNear.to.y)).toBeLessThan(ON);
  });

  it("put the near foot flat in front for the lizard, both forearms on the floor", () => {
    const { footNear, forearmFar, forearmNear, thighNear } = bones(LIZARD);
    expect(above(LIZARD, footNear.from.y)).toBeLessThan(ON);
    expect(thighNear.to.x).toBeGreaterThan(0.2);
    expect(above(LIZARD, forearmNear.to.y)).toBeLessThan(ON);
    expect(above(LIZARD, forearmFar.to.y)).toBeLessThan(ON);
  });

  it("lie on the belly for the sphinx: legs long behind, elbows down, chest and head up", () => {
    const { footFar, footNear, head, upperArmNear, forearmNear } = bones(SPHINX);
    expect(grounding(SPHINX)).toBeLessThan(ON);
    expect(footFar.to.x).toBeLessThan(-0.5);
    expect(footNear.to.y).toBeCloseTo(0, 6);
    expect(Math.abs(upperArmNear.to.y)).toBeLessThan(0.04);
    expect(Math.abs(forearmNear.to.y)).toBeLessThan(0.04);
    expect(head.to.y).toBeLessThan(-0.25);
    // It slides forward so the feet stay on the screen.
    expect(drift(SPHINX)).toBeLessThan(0);
  });

  it("sit on the floor for the twist: one leg long, the other knee up, a hand behind", () => {
    const { footNear, forearmNear, head, shinFar, thighNear } = bones(SEATED_TWIST);
    expect(grounding(SEATED_TWIST)).toBeLessThan(ON);
    expect(shinFar.to.x).toBeCloseTo(LEG, 6);
    expect(shinFar.to.y).toBeCloseTo(0, 6);
    expect(thighNear.to.y).toBeLessThan(-0.15);
    expect(Math.abs(footNear.from.y)).toBeLessThan(ON);
    expect(forearmNear.to.x).toBeLessThan(0);
    // `bones` hangs the arms from the neck; drawn, the shoulder is a little
    // lower and the hand is on the floor.
    expect(Math.abs(forearmNear.to.y)).toBeLessThan(0.04);
    expect(head.to.y).toBeCloseTo(-(LENGTH.torso + LENGTH.head), 6);
  });
});

describe("the new poses lying on the back or on a side", () => {
  it("lie along the floor, the head behind the hip", () => {
    for (const pose of [
      FIGURE_FOUR,
      LYING_HAMSTRING,
      SIDE_QUAD,
      LEGS_UP_WALL,
      REST_BREATH,
    ]) {
      const { head, torso } = bones(pose);
      expect(grounding(pose)).toBeLessThan(ON);
      expect(torso.to.x).toBeCloseTo(-LENGTH.torso, 6);
      expect(torso.to.y).toBeCloseTo(0, 6);
      expect(head.to.x).toBeLessThan(torso.to.x);
    }
  });

  it("cross the near ankle over the far knee for the figure four, the thigh closer on a breath", () => {
    const deep = deepen(FIGURE_FOUR, FIGURE_FOUR_BREATH);
    for (const pose of [FIGURE_FOUR, deep]) {
      const { forearmNear, shinNear, thighFar } = bones(pose);
      const knee = thighFar.to;
      expect(Math.hypot(shinNear.to.x - knee.x, shinNear.to.y - knee.y)).toBeLessThan(
        0.04,
      );
      // Both knees are up, and the hands are behind the far thigh.
      expect(knee.y).toBeLessThan(-0.15);
      expect(
        Math.hypot(forearmNear.to.x - knee.x, forearmNear.to.y - knee.y),
      ).toBeLessThan(0.08);
    }
    // Toward the chest is toward the head: further back.
    expect(bones(deep).thighFar.to.x).toBeLessThan(bones(FIGURE_FOUR).thighFar.to.x);
  });

  it("raise one straight leg for the hamstring, the other long on the floor", () => {
    const { shinFar, shinNear } = bones(LYING_HAMSTRING);
    expect(LYING_HAMSTRING.shinNear).toBe(LYING_HAMSTRING.thighNear);
    expect(shinNear.to.y).toBeLessThan(-0.4);
    expect(shinFar.to.x).toBeCloseTo(LEG, 6);
    expect(shinFar.to.y).toBeCloseTo(0, 6);
    // On a breath the foot comes toward the head, and never past upright
    // the other way.
    const deep = bones(deepen(LYING_HAMSTRING, LYING_HAMSTRING_BREATH));
    expect(deep.shinNear.to.x).toBeLessThan(shinNear.to.x);
  });

  it("bend the top knee for the quad on a side, the hand at the ankle, the heel closer on a breath", () => {
    const deep = deepen(SIDE_QUAD, SIDE_QUAD_BREATH);
    for (const pose of [SIDE_QUAD, deep]) {
      const { forearmNear, shinNear } = bones(pose);
      expect(
        Math.hypot(forearmNear.to.x - shinNear.to.x, forearmNear.to.y - shinNear.to.y),
      ).toBeLessThan(0.04);
    }
    const far = (pose: Pose) =>
      Math.hypot(bones(pose).shinNear.to.x, bones(pose).shinNear.to.y);
    expect(far(deep)).toBeLessThan(far(SIDE_QUAD));
    // The lower leg stays long on the floor.
    expect(bones(SIDE_QUAD).shinFar.to.x).toBeCloseTo(LEG, 6);
  });

  it("put both legs straight up the wall, and nothing up for the resting breath", () => {
    const wall = bones(LEGS_UP_WALL);
    expect(wall.shinNear.to.x).toBeCloseTo(0, 6);
    expect(wall.shinNear.to.y).toBeCloseTo(-LEG, 6);
    expect(wall.shinFar.to.y).toBeCloseTo(-LEG, 6);
    for (const bone of Object.values(bones(REST_BREATH))) {
      // Only the toes point up.
      expect(bone.to.y).toBeGreaterThan(-LENGTH.footFar - 0.001);
      expect(bone.to.y).toBeLessThan(0.001);
    }
  });

  it("let the chest rise with the breath when resting, the elbows on the floor", () => {
    for (const [pose, breath] of [
      [LEGS_UP_WALL, LEGS_UP_WALL_BREATH],
      [REST_BREATH, REST_BREATH_BREATH],
    ] as const) {
      const deep = deepen(pose, breath);
      const { torso, upperArmFar, upperArmNear } = bones(deep);
      expect(torso.to.y).toBeLessThan(-0.01);
      expect(Math.abs(upperArmNear.to.y)).toBeLessThan(ON);
      expect(Math.abs(upperArmFar.to.y)).toBeLessThan(ON);
      // Nothing goes under the floor: the figure does not hop.
      expect(grounding(deep)).toBeCloseTo(grounding(pose), 2);
    }
  });
});

describe("the new poses sitting and kneeling on the floor, second block", () => {
  it("sit tall with a knee in front and one behind for the 90/90", () => {
    const { head, shinFar, shinNear, thighFar, thighNear } = bones(NINETY_NINETY);
    expect(grounding(NINETY_NINETY)).toBeLessThan(ON);
    expect(head.to.y).toBeLessThan(-0.4);
    expect(thighNear.to.x).toBeGreaterThan(0.2);
    expect(thighFar.to.x).toBeLessThan(-0.2);
    // Both feet rest on the floor.
    expect(Math.abs(shinNear.to.y)).toBeLessThan(ON);
    expect(Math.abs(shinFar.to.y)).toBeLessThan(ON);
  });

  it("fold over the front shin for the pigeon, the back leg long, the hands down", () => {
    const deep = deepen(PIGEON, PIGEON_BREATH);
    for (const pose of [PIGEON, deep]) {
      const { forearmFar, forearmNear, shinFar, thighNear, torso } = bones(pose);
      expect(grounding(pose)).toBeLessThan(ON);
      expect(thighNear.to.x).toBeGreaterThan(0.2);
      expect(shinFar.to.x).toBeCloseTo(-LEG, 6);
      expect(shinFar.to.y).toBeCloseTo(0, 6);
      expect(torso.to.x).toBeGreaterThan(0.15);
      // `bones` hangs the arms from the neck; drawn, the shoulder is a
      // little lower and the hands are on the floor.
      expect(Math.abs(forearmNear.to.y)).toBeLessThan(0.04);
      expect(Math.abs(forearmFar.to.y)).toBeLessThan(0.04);
    }
    // The near shin comes back toward the hip, just above the floor.
    expect(Math.abs(bones(PIGEON).shinNear.to.x)).toBeLessThan(0.05);
    expect(above(PIGEON, bones(PIGEON).shinNear.to.y)).toBeLessThan(0.06);
    expect(bones(deep).head.to.y).toBeGreaterThan(bones(PIGEON).head.to.y);
  });

  it("sit with both legs long for the forward fold, toes up, the chest over them", () => {
    const { footNear, head, shinFar, shinNear, torso } = bones(SEATED_FOLD);
    expect(grounding(SEATED_FOLD)).toBeLessThan(ON);
    for (const shin of [shinFar, shinNear]) {
      expect(shin.to.x).toBeCloseTo(LEG, 6);
      expect(shin.to.y).toBeCloseTo(0, 6);
    }
    expect(footNear.to.y).toBeLessThan(-0.05);
    expect(torso.to.x).toBeGreaterThan(0.2);
    // Folded, not lying on the legs: the head stays above the floor.
    expect(head.to.y).toBeLessThan(-0.08);
  });

  it("kneel on one knee for the half split, the front leg straight with its heel down", () => {
    const { footNear, forearmFar, forearmNear, shinFar, shinNear, thighFar } =
      bones(HALF_SPLIT);
    expect(thighFar.to.x).toBeCloseTo(0, 6);
    expect(above(HALF_SPLIT, thighFar.to.y)).toBeLessThan(ON);
    expect(above(HALF_SPLIT, shinFar.to.y)).toBeLessThan(ON);
    expect(shinFar.to.x).toBeLessThan(-0.2);
    expect(HALF_SPLIT.shinNear).toBe(HALF_SPLIT.thighNear);
    expect(shinNear.to.x).toBeGreaterThan(0.35);
    expect(above(HALF_SPLIT, shinNear.to.y)).toBeLessThan(ON);
    // Toes up.
    expect(footNear.to.y).toBeLessThan(shinNear.to.y - 0.04);
    expect(above(HALF_SPLIT, forearmNear.to.y)).toBeLessThan(ON);
    expect(above(HALF_SPLIT, forearmFar.to.y)).toBeLessThan(ON);
  });

  it("sit back on the heels for the toes and for the shins, knees on the floor", () => {
    for (const pose of [TOE_STRETCH, SHIN_STRETCH]) {
      const { head, thighFar, thighNear } = bones(pose);
      expect(grounding(pose)).toBeLessThan(0.15);
      for (const thigh of [thighFar, thighNear]) {
        expect(thigh.to.x).toBeGreaterThan(0.15);
        expect(above(pose, thigh.to.y)).toBeLessThan(ON);
      }
      expect(head.to.y).toBeLessThan(-0.4);
    }
    // Toes tucked under: the toes on the floor, the heel up.
    const toes = bones(TOE_STRETCH).footNear;
    expect(above(TOE_STRETCH, toes.to.y)).toBeLessThan(ON);
    expect(above(TOE_STRETCH, toes.from.y)).toBeGreaterThan(0.04);
    // The tops of the feet flat: the whole foot on the floor, pointing back.
    const flat = bones(SHIN_STRETCH).footNear;
    expect(above(SHIN_STRETCH, flat.from.y)).toBeLessThan(ON);
    expect(above(SHIN_STRETCH, flat.to.y)).toBeLessThan(ON);
    expect(flat.to.x).toBeLessThan(flat.from.x);
  });

  it("lift the hips highest for the downward dog, hands and feet on the floor", () => {
    const all = bones(DOWN_DOG);
    for (const bone of Object.values(all)) {
      expect(bone.to.y).toBeGreaterThan(-0.001);
    }
    expect(grounding(DOWN_DOG)).toBeGreaterThan(0.35);
    for (const y of [
      all.forearmNear.to.y,
      all.forearmFar.to.y,
      all.footNear.from.y,
      all.footNear.to.y,
      all.footFar.from.y,
    ]) {
      expect(above(DOWN_DOG, y)).toBeLessThan(ON);
    }
    // Hands in front, feet behind, legs straight.
    expect(all.forearmNear.to.x).toBeGreaterThan(0.35);
    expect(all.footNear.from.x).toBeLessThan(-0.2);
    expect(DOWN_DOG.shinNear).toBe(DOWN_DOG.thighNear);
  });
});
