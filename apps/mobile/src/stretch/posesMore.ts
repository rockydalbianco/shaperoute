import type { Breath, Pose } from "./poses";

/**
 * The poses of the exercises that TASK-520 adds (ADR-0415), seen from the
 * side like those of `poses.ts`: the same twelve segments and the same
 * directions (0 down, 90 forward, 180 up, -90 back). Each was drawn on a
 * sheet before it was written here, and `posesMore.test.ts` checks that it
 * stands, sits or lies on the floor and stays whole on a narrow phone.
 *
 * A shin that must bring a foot to the floor has the angle that does it,
 * to a tenth of a degree.
 */

/** Standing, the near arm straight forward at shoulder height, palm up; the far
 * hand holds its fingers and pulls them back. */
export const WRIST_FLEXOR: Pose = {
  torso: 180,
  head: 180,
  upperArmFar: 72,
  forearmFar: 108,
  upperArmNear: 90,
  forearmNear: 90,
  thighFar: 0,
  shinFar: 0,
  footFar: 90,
  thighNear: 0,
  shinNear: 0,
  footNear: 90,
};

/** The far hand pulls a little more. */
export const WRIST_FLEXOR_BREATH: Breath = { upperArmFar: 3, forearmFar: 6 };

/** Standing, the near arm forward and a little down, palm down; the far hand
 * presses the back of the hand. */
export const WRIST_EXTENSOR: Pose = {
  torso: 180,
  head: 180,
  upperArmFar: 55,
  forearmFar: 92,
  upperArmNear: 72,
  forearmNear: 72,
  thighFar: 0,
  shinFar: 0,
  footFar: 90,
  thighNear: 0,
  shinNear: 0,
  footNear: 90,
};

/** The far hand presses a little more. */
export const WRIST_EXTENSOR_BREATH: Breath = { upperArmFar: 3, forearmFar: 6 };

/** Standing, the near arm straight back at shoulder height, the palm on a wall
 * behind; the chest turns away from it. */
export const BICEPS_WALL: Pose = {
  torso: 176,
  head: 178,
  upperArmFar: 8,
  forearmFar: 4,
  upperArmNear: -88,
  forearmNear: -88,
  thighFar: 0,
  shinFar: 0,
  footFar: 90,
  thighNear: 0,
  shinNear: 0,
  footNear: 90,
};

/** The arm a little higher behind, the chest further away. */
export const BICEPS_WALL_BREATH: Breath = {
  torso: -2,
  upperArmNear: -8,
  forearmNear: -8,
};

/** A small step through a door: the near elbow at shoulder height behind, the
 * forearm up on the frame, both feet on the floor. */
export const DOORWAY_CHEST: Pose = {
  torso: 174,
  head: 178,
  upperArmFar: 6,
  forearmFar: 2,
  upperArmNear: -75,
  forearmNear: 180,
  thighFar: -24,
  shinFar: -14.2,
  footFar: 90,
  thighNear: 26,
  shinNear: -10,
  footNear: 90,
};

/** A little further through the door, the elbow left behind. */
export const DOORWAY_CHEST_BREATH: Breath = { torso: -4, head: -4, upperArmNear: -6 };

/** Sunk low on both feet, heels down, the hip under the knees; the elbows
 * inside the knees, the hands together. */
export const DEEP_SQUAT: Pose = {
  torso: 158,
  head: 170,
  upperArmFar: 40,
  forearmFar: 120,
  upperArmNear: 48,
  forearmNear: 128,
  thighFar: 106,
  shinFar: -29.9,
  footFar: 90,
  thighNear: 112,
  shinNear: -14,
  footNear: 90,
};

/** The chest lifts between the knees. */
export const DEEP_SQUAT_BREATH: Breath = { torso: 4, head: 3 };

/** Sitting on a chair, the far foot on the floor; the near ankle rests on the
 * far knee and the back leans forward, long. */
export const CHAIR_FIGURE_FOUR: Pose = {
  torso: 152,
  head: 158,
  upperArmFar: 35,
  forearmFar: 65,
  upperArmNear: 42,
  forearmNear: 72,
  thighFar: 90,
  shinFar: 0,
  footFar: 90,
  thighNear: 33,
  shinNear: 151,
  footNear: 60,
};

/** The back leans further over the shin. */
export const CHAIR_FIGURE_FOUR_BREATH: Breath = { torso: -6, head: -6 };

/** A step back with both knees bent and both heels down, the hands forward as
 * if on a wall: the calf pulls lower than with the knee straight. */
export const SOLEUS: Pose = {
  torso: 170,
  head: 172,
  upperArmFar: 98,
  forearmFar: 88,
  upperArmNear: 98,
  forearmNear: 88,
  thighFar: 6,
  shinFar: -50.3,
  footFar: 90,
  thighNear: 48,
  shinNear: -12,
  footNear: 90,
};

/** A little more weight toward the wall. */
export const SOLEUS_BREATH: Breath = { torso: -4, head: -4 };

/** On hands and knees, the far arm slid back under the body, the shoulder and
 * the head down; the near forearm on the floor in front. */
export const THREAD_NEEDLE: Pose = {
  torso: 62,
  head: 68,
  upperArmFar: -58,
  forearmFar: -88,
  upperArmNear: 60,
  forearmNear: 84,
  thighFar: 0,
  shinFar: -90,
  footFar: -90,
  thighNear: 0,
  shinNear: -90,
  footNear: -90,
};

/** The arm a little further under, the head heavier. */
export const THREAD_NEEDLE_BREATH: Breath = { head: -4, forearmFar: -4 };

/** Child's pose with both hands walked to one side: sitting back on the heels,
 * the arms long on the floor. */
export const SIDE_REACH_CHILD: Pose = {
  torso: 78,
  head: 84,
  upperArmFar: 84,
  forearmFar: 84,
  upperArmNear: 78,
  forearmNear: 82,
  thighFar: 60,
  shinFar: -90,
  footFar: -90,
  thighNear: 60,
  shinNear: -90,
  footNear: -90,
};

/** The chest a little lower, toward the thighs. */
export const SIDE_REACH_CHILD_BREATH: Breath = { torso: -2, head: -2 };

/** Lying on the belly, the legs long on the floor; the chest lifted, the
 * elbows under the shoulders and the forearms flat in front. */
export const SPHINX: Pose = {
  torso: 126,
  head: 168,
  upperArmFar: -10,
  forearmFar: 90,
  upperArmNear: -15,
  forearmNear: 90,
  thighFar: -90,
  shinFar: -90,
  footFar: -90,
  thighNear: -90,
  shinNear: -90,
  footNear: -90,
};

/** The chest a little higher. */
export const SPHINX_BREATH: Breath = { torso: 6, head: 6 };

/** Sitting tall on the floor, the far leg straight, the near knee up with its
 * foot beyond the far knee; the near hand on the floor behind, the far arm on
 * the knee. */
export const SEATED_TWIST: Pose = {
  torso: 180,
  head: 180,
  upperArmFar: 62,
  forearmFar: 112,
  upperArmNear: -35,
  forearmNear: -25,
  thighFar: 90,
  shinFar: 90,
  footFar: 180,
  thighNear: 150,
  shinNear: 25.3,
  footNear: 90,
};

/** A little further round: the head, and the arm against the knee. */
export const SEATED_TWIST_BREATH: Breath = { head: 6, upperArmFar: 4 };

/** A low lunge with the far knee and shin on the floor, the near foot flat in
 * front; the chest down, both forearms on the floor inside the foot. */
export const LIZARD: Pose = {
  torso: 86,
  head: 80,
  upperArmFar: -48,
  forearmFar: 87,
  upperArmNear: -50,
  forearmNear: 85,
  thighFar: -55,
  shinFar: -90,
  footFar: 180,
  thighNear: 105,
  shinNear: -29.7,
  footNear: 90,
};

/** The chest and the hips a little lower. */
export const LIZARD_BREATH: Breath = { torso: -3, head: -3 };
