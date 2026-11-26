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

/** Sitting tall on the floor with both knees bent at right angles: the near
 * shin in front, the far leg folded behind; a hand on the floor each side. */
export const NINETY_NINETY: Pose = {
  torso: 178,
  head: 180,
  upperArmFar: -40,
  forearmFar: -30,
  upperArmNear: 25,
  forearmNear: 62,
  thighFar: -110,
  shinFar: -70,
  footFar: -90,
  thighNear: 100,
  shinNear: -80,
  footNear: -90,
};

/** The chest a little forward, over the front shin. */
export const NINETY_NINETY_BREATH: Breath = {
  torso: -5,
  head: -5,
};

/** Lying on the back, the head behind: the far thigh drawn toward the chest
 * with its shin level, the near ankle across its knee, both hands behind the
 * far thigh. */
export const FIGURE_FOUR: Pose = {
  torso: -90,
  head: -90,
  upperArmFar: 180,
  forearmFar: 96,
  upperArmNear: 180,
  forearmNear: 100,
  thighFar: -150,
  shinFar: 90,
  footFar: 180,
  thighNear: 150,
  shinNear: -90,
  footNear: 180,
};

/** The thigh a little closer to the chest, the ankle with it. */
export const FIGURE_FOUR_BREATH: Breath = {
  thighFar: 6,
  shinFar: 4,
  thighNear: 4,
};

/** The near shin folded on the floor in front of the hip, the far leg long
 * behind; the chest folded forward over the shin, the hands on the floor. */
export const PIGEON: Pose = {
  torso: 130,
  head: 122,
  upperArmFar: -8,
  forearmFar: 84,
  upperArmNear: -10,
  forearmNear: 84,
  thighFar: -90,
  shinFar: -90,
  footFar: -90,
  thighNear: 90,
  shinNear: -100,
  footNear: -90,
};

/** The chest a little lower; the elbows bend and the forearms come to the floor. */
export const PIGEON_BREATH: Breath = {
  torso: -5,
  head: -5,
  upperArmNear: -4.5,
  forearmNear: 6,
  upperArmFar: -6,
  forearmFar: 6,
};

/** Sitting with both legs straight in front, toes up; folded forward from the
 * hips, the arms long over the shins. */
export const SEATED_FOLD: Pose = {
  torso: 115,
  head: 105,
  upperArmFar: 96,
  forearmFar: 80,
  upperArmNear: 100,
  forearmNear: 82,
  thighFar: 90,
  shinFar: 90,
  footFar: 180,
  thighNear: 90,
  shinNear: 90,
  footNear: 180,
};

/** The chest a little lower over the legs. */
export const SEATED_FOLD_BREATH: Breath = {
  torso: -6,
  head: -6,
};

/** Lying on the back, the far leg long on the floor; the near leg straight up
 * and both hands behind its thigh. */
export const LYING_HAMSTRING: Pose = {
  torso: -90,
  head: -90,
  upperArmFar: 126,
  forearmFar: 132,
  upperArmNear: 130,
  forearmNear: 130,
  thighFar: 90,
  shinFar: 90,
  footFar: 180,
  thighNear: -170,
  shinNear: -170,
  footNear: -80,
};

/** The leg a little closer to the head. */
export const LYING_HAMSTRING_BREATH: Breath = {
  thighNear: 6,
  shinNear: 6,
};

/** Lying on one side, the head on the lower arm; the near knee bent with its
 * heel drawn toward the glutes, the near hand on the ankle. */
export const SIDE_QUAD: Pose = {
  torso: -90,
  head: -90,
  upperArmFar: -90,
  forearmFar: 150,
  upperArmNear: 105,
  forearmNear: 105,
  thighFar: 90,
  shinFar: 90,
  footFar: 180,
  thighNear: 90,
  shinNear: -110,
  footNear: -120,
};

/** The heel a little closer, the hand with it. */
export const SIDE_QUAD_BREATH: Breath = {
  shinNear: 6,
  footNear: 6,
  forearmNear: -8,
};

/** Kneeling on the far knee, its shin on the floor behind; the near leg
 * straight in front with the heel down and the toes up, the back long over
 * it, the hands on the floor. */
export const HALF_SPLIT: Pose = {
  torso: 95,
  head: 92,
  upperArmFar: 25.8,
  forearmFar: 35.8,
  upperArmNear: 30.8,
  forearmNear: 30.8,
  thighFar: 0,
  shinFar: -90,
  footFar: -90,
  thighNear: 59.3,
  shinNear: 59.3,
  footNear: 150,
};

/** The head a little lower, toward the shin. */
export const HALF_SPLIT_BREATH: Breath = {
  head: -4,
};

/** Kneeling with the toes tucked under, sitting back on the heels; the back
 * tall, the hands on the thighs. */
export const TOE_STRETCH: Pose = {
  torso: 180,
  head: 180,
  upperArmFar: 26,
  forearmFar: 70,
  upperArmNear: 30,
  forearmNear: 72,
  thighFar: 60,
  shinFar: -104,
  footFar: 20,
  thighNear: 60,
  shinNear: -104,
  footNear: 20,
};

/** A little more weight back on the heels. */
export const TOE_STRETCH_BREATH: Breath = {
  torso: 3,
  head: 3,
};

/** Kneeling with the tops of the feet flat on the floor, sitting back on the
 * heels and leaning a little back; the hands on the thighs. */
export const SHIN_STRETCH: Pose = {
  torso: -175,
  head: -178,
  upperArmFar: 20,
  forearmFar: 64,
  upperArmNear: 24,
  forearmNear: 66,
  thighFar: 60,
  shinFar: -90,
  footFar: -90,
  thighNear: 60,
  shinNear: -90,
  footNear: -90,
};

/** Leaning a little further back. */
export const SHIN_STRETCH_BREATH: Breath = {
  torso: 3,
  head: 3,
};

/** Hands and feet on the floor, the hips high: the back and the arms one long
 * line, the legs straight, the heels down. */
export const DOWN_DOG: Pose = {
  torso: 50,
  head: 48,
  upperArmFar: 46.3,
  forearmFar: 46.3,
  upperArmNear: 46.3,
  forearmNear: 46.3,
  thighFar: -30,
  shinFar: -30,
  footFar: 90,
  thighNear: -30,
  shinNear: -30,
  footNear: 90,
};

/** The head lets go between the arms. */
export const DOWN_DOG_BREATH: Breath = {
  head: 4,
};

/** Lying on the back with both legs straight up a wall, the arms on the floor
 * by the sides. */
export const LEGS_UP_WALL: Pose = {
  torso: -90,
  head: -90,
  upperArmFar: 90,
  forearmFar: 90,
  upperArmNear: 90,
  forearmNear: 90,
  thighFar: 180,
  shinFar: 180,
  footFar: -90,
  thighNear: 180,
  shinNear: 180,
  footNear: -90,
};

/** The chest rises with the breath; the elbows stay on the floor. */
export const LEGS_UP_WALL_BREATH: Breath = {
  torso: -4,
  upperArmNear: -6,
  upperArmFar: -6,
};

/** Lying flat on the back, the legs long, the arms on the floor by the sides. */
export const REST_BREATH: Pose = {
  torso: -90,
  head: -90,
  upperArmFar: 90,
  forearmFar: 90,
  upperArmNear: 90,
  forearmNear: 90,
  thighFar: 90,
  shinFar: 90,
  footFar: 180,
  thighNear: 90,
  shinNear: 90,
  footNear: 180,
};

/** The chest rises with the breath; the elbows stay on the floor. */
export const REST_BREATH_BREATH: Breath = {
  torso: -4,
  upperArmNear: -6,
  upperArmFar: -6,
};
