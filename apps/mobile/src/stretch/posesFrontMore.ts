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

/** Standing, hugging: the arms crossed over the chest, each hand on the other
 * shoulder. */
export const ARM_OPENERS: FrontPose = {
  torso: 180,
  head: 180,
  upperArmLeft: -12,
  forearmLeft: -132,
  upperArmRight: 12,
  forearmRight: 132,
  thighLeft: 0,
  shinLeft: 0,
  thighRight: 0,
  shinRight: 0,
};

/** The arms open wide, the hands going straight across at shoulder height.
 * The elbows drop on the way: an arm that comes toward whoever looks gets
 * shorter, and a bar can only bend. */
export const ARM_OPENERS_MOVE: FrontBreath = {
  upperArmLeft: 104,
  forearmLeft: -130,
  upperArmRight: -104,
  forearmRight: 130,
};

/** Lying on a side, seen from above: the knees bent and both arms out to the
 * side the body faces. */
export const OPEN_BOOK: FrontPose = {
  torso: 180,
  head: 172,
  upperArmLeft: 90,
  forearmLeft: 92,
  upperArmRight: 84,
  forearmRight: 90,
  thighLeft: 80,
  shinLeft: -6,
  thighRight: 74,
  shinRight: -10,
  above: true,
};

/** The top arm opens to the other side, the hand straight across the chest,
 * and the head follows it. */
export const OPEN_BOOK_MOVE: FrontBreath = {
  upperArmRight: -176,
  forearmRight: 174,
  head: 14,
};

/** Standing with the feet wide, the upper body turned to one side: both arms
 * swung that way, the head with them. A turn does not show from the front;
 * the swinging arms do. */
export const TRUNK_TURNS: FrontPose = {
  torso: 180,
  head: 186,
  upperArmLeft: -22,
  forearmLeft: -72,
  upperArmRight: -52,
  forearmRight: -84,
  thighLeft: 14,
  shinLeft: 14,
  thighRight: -14,
  shinRight: -14,
};

/** The arms swing across to the other side, the head with them. */
export const TRUNK_TURNS_MOVE: FrontBreath = {
  head: -12,
  upperArmLeft: 74,
  forearmLeft: 156,
  upperArmRight: 74,
  forearmRight: 156,
};

/** Lying on the back, seen from above: the knees bent, the feet wide and both
 * knees fallen to one side. */
export const KNEE_SWAY: FrontPose = {
  torso: 180,
  head: 180,
  upperArmLeft: 38,
  forearmLeft: 30,
  upperArmRight: -38,
  forearmRight: -30,
  thighLeft: -7.1,
  shinLeft: 53.5,
  thighRight: -52.1,
  shinRight: 8.6,
  above: true,
};

/** Both knees go over to the other side; the feet end where they began. */
export const KNEE_SWAY_MOVE: FrontBreath = {
  thighLeft: 59.2,
  shinLeft: -62.1,
  thighRight: 59.2,
  shinRight: -62.1,
};

/** Standing with the feet apart and the hands on the hips, the hips pushed to
 * one side and the body leaning back over the feet. From the front a circle
 * of the hips is a sway from side to side. */
export const HIP_CIRCLES: FrontPose = {
  torso: 172,
  head: 177,
  upperArmLeft: 26.2,
  forearmLeft: -51.5,
  upperArmRight: -38.3,
  forearmRight: 28.2,
  thighLeft: 20.6,
  shinLeft: 20.6,
  thighRight: -26.8,
  shinRight: 10.8,
  planted: true,
};

/** The hips go across to the other side, the hands still on them; both feet
 * stay where they are. */
export const HIP_CIRCLES_MOVE: FrontBreath = {
  torso: 16,
  head: 6,
  upperArmLeft: 12.1,
  forearmLeft: 23.3,
  upperArmRight: 12.1,
  forearmRight: 23.3,
  thighLeft: 6.2,
  shinLeft: -31.4,
  thighRight: 6.2,
  shinRight: -31.4,
};
