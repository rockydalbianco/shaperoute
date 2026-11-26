import type { FrontBreath, FrontPose } from "./posesFront";

/**
 * The poses of the exercises seen from the front that TASK-520 adds
 * (ADR-0415), for `FigureFront`: directions as on the screen (0 down, 180
 * up, 90 to the left, -90 to the right), `Left` the limb drawn on the left.
 * The other side of each is its mirror. Each was drawn on a sheet before it
 * was written here, and `posesFrontMore.test.ts` checks that it stands on
 * the floor and stays whole on a narrow phone.
 */

/** Standing, an ear tilted toward its shoulder, both shoulders low. */
export const NECK_SIDE: FrontPose = {
  torso: 180,
  head: 144,
  upperArmLeft: 4,
  forearmLeft: 0,
  upperArmRight: -4,
  forearmRight: 0,
  thighLeft: 0,
  shinLeft: 0,
  thighRight: 0,
  shinRight: 0,
};

/** The ear a little closer to the shoulder. */
export const NECK_SIDE_BREATH: FrontBreath = {
  head: -8,
};

/** Standing, the head turned to look over a shoulder. A head with no face
 * cannot show a turn: it leans a little that way, and the line under the
 * figure says the rest. */
export const NECK_TURN: FrontPose = {
  torso: 180,
  head: 168,
  upperArmLeft: 6,
  forearmLeft: 0,
  upperArmRight: -6,
  forearmRight: 0,
  thighLeft: 0,
  shinLeft: 0,
  thighRight: 0,
  shinRight: 0,
};

/** A little further round. */
export const NECK_TURN_BREATH: FrontBreath = {
  head: -5,
};

/** Standing, one arm over the head and the body leaning to the other side,
 * the other arm down along the leg. */
export const SIDE_BEND: FrontPose = {
  torso: 162,
  head: 150,
  upperArmLeft: 14,
  forearmLeft: 6,
  upperArmRight: 155,
  forearmRight: 138,
  thighLeft: 0,
  shinLeft: 0,
  thighRight: 0,
  shinRight: 0,
};

/** A little further over, the arm with it. */
export const SIDE_BEND_BREATH: FrontBreath = {
  torso: -6,
  head: -7,
  upperArmRight: -7,
  forearmRight: -8,
};

/** Lying on the back, seen from above: the arms wide on the floor, both knees
 * bent and dropped to one side. */
export const LYING_TWIST: FrontPose = {
  torso: 180,
  head: -174,
  upperArmLeft: 92,
  forearmLeft: 95,
  upperArmRight: -92,
  forearmRight: -95,
  thighLeft: 78,
  shinLeft: -8,
  thighRight: 70,
  shinRight: -12,
  above: true,
};

/** The knees a little closer to the floor, the head turning away. */
export const LYING_TWIST_BREATH: FrontBreath = {
  thighLeft: 5,
  thighRight: 6,
  head: 4,
};

/** Sitting on the floor, the knees open to the sides and the feet together in
 * front, the hands on the shins. */
export const BUTTERFLY: FrontPose = {
  torso: 180,
  head: 180,
  upperArmLeft: 22,
  forearmLeft: -24,
  upperArmRight: -22,
  forearmRight: 24,
  thighLeft: 68,
  shinLeft: -80,
  thighRight: -68,
  shinRight: 80,
};

/** The knees fall a little more open. */
export const BUTTERFLY_BREATH: FrontBreath = {
  thighLeft: -6,
  shinLeft: -6,
  thighRight: 6,
  shinRight: 6,
};

/** On the forearms and the knees, seen from above: the knees wide, the shins
 * straight back, the arms forward on the floor. */
export const FROG: FrontPose = {
  torso: 180,
  head: 180,
  upperArmLeft: 150,
  forearmLeft: 180,
  upperArmRight: -150,
  forearmRight: 180,
  thighLeft: 96,
  shinLeft: 4,
  thighRight: -96,
  shinRight: -4,
  above: true,
};

/** The hips push back between the knees. */
export const FROG_BREATH: FrontBreath = {
  thighLeft: 9,
  thighRight: -9,
  upperArmLeft: 6,
  upperArmRight: -6,
};

/** Standing with the feet wide, folded forward: the body hangs between the
 * legs, the hands on the floor. Folded, the torso's frame is turned over:
 * the arm called Left hangs on the right of the screen. */
export const WIDE_FOLD: FrontPose = {
  torso: 0,
  head: 0,
  upperArmLeft: -62,
  forearmLeft: 62,
  upperArmRight: 62,
  forearmRight: -62,
  thighLeft: 26,
  shinLeft: 26,
  thighRight: -26,
  shinRight: -26,
};

/** The elbows bend a little more, the head lower. */
export const WIDE_FOLD_BREATH: FrontBreath = {
  upperArmLeft: -5,
  forearmLeft: 5,
  upperArmRight: 5,
  forearmRight: -5,
};

/** Standing, the elbows out at shoulder height and the hands up, like a
 * goalpost. */
export const GOALPOST: FrontPose = {
  torso: 180,
  head: 180,
  upperArmLeft: 92,
  forearmLeft: 178,
  upperArmRight: -92,
  forearmRight: -178,
  thighLeft: 0,
  shinLeft: 0,
  thighRight: 0,
  shinRight: 0,
};

/** The elbows a little higher and back, the chest open. */
export const GOALPOST_BREATH: FrontBreath = {
  upperArmLeft: 5,
  forearmLeft: 6,
  upperArmRight: -5,
  forearmRight: -6,
};

/** Standing with the feet wide, the hands on the hips. */
export const SIDE_LUNGE: FrontPose = {
  torso: 180,
  head: 180,
  upperArmLeft: 38,
  forearmLeft: -52,
  upperArmRight: -38,
  forearmRight: 52,
  thighLeft: 25,
  shinLeft: 25,
  thighRight: -25,
  shinRight: -25,
  planted: true,
};

/** The weight goes into one bent knee, the other leg straight; both feet stay
 * where they are. */
export const SIDE_LUNGE_MOVE: FrontBreath = {
  thighLeft: 28.3,
  shinLeft: -56.3,
  thighRight: -18.7,
  shinRight: -18.7,
};
