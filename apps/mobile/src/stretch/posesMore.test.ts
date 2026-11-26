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
  LIZARD,
  SEATED_TWIST,
  SIDE_REACH_CHILD,
  SOLEUS,
  SPHINX,
  THREAD_NEEDLE,
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
