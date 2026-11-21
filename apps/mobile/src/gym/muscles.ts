import type { Language } from "../i18n/languages";

/**
 * Which muscles each exercise works, for the body drawn beside its figure
 * (TASK-465, ADR-0376, the user's «fai vedere sull'omino in un altro quale
 * muscolo alleni» and «B, sagoma accanto» of 2026-11-11). The catalog only
 * knows an exercise's group; this table is the app's alone, as `MOVE_OF`
 * is: it draws, it measures nothing.
 *
 * The names are here in the app's five languages and not through `t()`,
 * as the groups' are in groups.ts.
 */
export const MUSCLES = [
  "chest",
  "shoulders",
  "biceps",
  "forearms",
  "abs",
  "obliques",
  "quads",
  "adductors",
  "traps",
  "rear_delts",
  "triceps",
  "lats",
  "lower_back",
  "glutes",
  "abductors",
  "hamstrings",
  "calves",
] as const;

export type Muscle = (typeof MUSCLES)[number];

/** The body seen from the front or from the back. */
export type BodySide = "front" | "back";

/** The side of the body each muscle is drawn on. */
export const MUSCLE_SIDE: Readonly<Record<Muscle, BodySide>> = {
  chest: "front",
  shoulders: "front",
  biceps: "front",
  forearms: "front",
  abs: "front",
  obliques: "front",
  quads: "front",
  adductors: "front",
  traps: "back",
  rear_delts: "back",
  triceps: "back",
  lats: "back",
  lower_back: "back",
  glutes: "back",
  abductors: "back",
  hamstrings: "back",
  calves: "back",
};

type Names = Readonly<Record<Language, string>>;

function names(en: string, it: string, de: string, fr: string, es: string): Names {
  return { en, it, de, fr, es };
}

const NAMES: Readonly<Record<Muscle, Names>> = {
  chest: names("Chest", "Petto", "Brust", "Pectoraux", "Pecho"),
  shoulders: names("Shoulders", "Spalle", "Schultern", "Épaules", "Hombros"),
  biceps: names("Biceps", "Bicipiti", "Bizeps", "Biceps", "Bíceps"),
  forearms: names("Forearms", "Avambracci", "Unterarme", "Avant-bras", "Antebrazos"),
  abs: names("Abs", "Addominali", "Bauchmuskeln", "Abdominaux", "Abdominales"),
  obliques: names(
    "Obliques",
    "Obliqui",
    "Schräge Bauchmuskeln",
    "Obliques",
    "Oblicuos",
  ),
  quads: names("Quads", "Quadricipiti", "Quadrizeps", "Quadriceps", "Cuádriceps"),
  adductors: names("Adductors", "Adduttori", "Adduktoren", "Adducteurs", "Aductores"),
  traps: names("Traps", "Trapezi", "Trapezmuskel", "Trapèzes", "Trapecios"),
  rear_delts: names(
    "Rear delts",
    "Deltoidi posteriori",
    "Hintere Schulter",
    "Deltoïdes postérieurs",
    "Deltoides posteriores",
  ),
  triceps: names("Triceps", "Tricipiti", "Trizeps", "Triceps", "Tríceps"),
  lats: names("Lats", "Dorsali", "Latissimus", "Dorsaux", "Dorsales"),
  lower_back: names("Lower back", "Lombari", "Unterer Rücken", "Lombaires", "Lumbares"),
  glutes: names("Glutes", "Glutei", "Gesäß", "Fessiers", "Glúteos"),
  abductors: names("Abductors", "Abduttori", "Abduktoren", "Abducteurs", "Abductores"),
  hamstrings: names(
    "Hamstrings",
    "Femorali",
    "Beinbeuger",
    "Ischio-jambiers",
    "Isquiotibiales",
  ),
  calves: names("Calves", "Polpacci", "Waden", "Mollets", "Gemelos"),
};

/** The words beside the names, in the guide and for the screen reader. */
const WORDS = {
  main: names(
    "Main muscles",
    "Muscoli principali",
    "Hauptmuskeln",
    "Muscles principaux",
    "Músculos principales",
  ),
  also: names("Also", "Anche", "Auch", "Aussi", "También"),
  front: names("Front", "Davanti", "Vorne", "Devant", "Delante"),
  back: names("Back", "Dietro", "Hinten", "Derrière", "Detrás"),
} as const;

export function muscleName(muscle: Muscle, language: Language): string {
  return NAMES[muscle][language];
}

export function muscleWord(word: keyof typeof WORDS, language: Language): string {
  return WORDS[word][language];
}

/** What an exercise works: the muscles it is done for, the first one the
 * one the small body shows, and those that help. */
export type Worked = {
  primary: readonly Muscle[];
  secondary: readonly Muscle[];
};

function work(primary: readonly Muscle[], secondary: readonly Muscle[] = []): Worked {
  return { primary, secondary };
}

const PRESS = work(["chest"], ["shoulders", "triceps"]);
const FLY = work(["chest"], ["shoulders"]);
const PULL = work(["lats"], ["biceps", "traps", "forearms"]);
const ROW = work(["lats"], ["traps", "rear_delts", "biceps"]);
const HEAVY_ROW = work(["lats"], ["traps", "rear_delts", "biceps", "lower_back"]);
const SQUAT = work(["quads", "glutes"], ["hamstrings", "lower_back"]);
const SPLIT = work(["quads", "glutes"], ["hamstrings"]);
const SHOULDER_PRESS = work(["shoulders"], ["triceps", "traps"]);
const REAR = work(["rear_delts"], ["traps"]);
const CURL = work(["biceps"], ["forearms"]);
const EXTENSION = work(["triceps"]);
const CRUNCH = work(["abs"], ["obliques"]);
const RUN = work(["quads", "calves"], ["hamstrings", "glutes"]);
const BIKE = work(["quads"], ["glutes", "hamstrings", "calves"]);
const CLIMB = work(["quads", "glutes"], ["hamstrings", "calves"]);

/** Every exercise of the catalog, by its key (muscles.test.ts checks it). */
export const MUSCLES_OF: Readonly<Record<string, Worked>> = {
  bench_press: PRESS,
  incline_bench_press: PRESS,
  decline_bench_press: PRESS,
  dumbbell_bench_press: PRESS,
  dumbbell_fly: FLY,
  chest_press_machine: PRESS,
  pec_deck: FLY,
  cable_crossover: FLY,
  push_up: work(["chest"], ["shoulders", "triceps", "abs"]),
  dips: work(["chest"], ["triceps", "shoulders"]),
  deadlift: work(
    ["lower_back", "glutes", "hamstrings"],
    ["quads", "traps", "forearms"],
  ),
  pull_up: PULL,
  chin_up: PULL,
  assisted_pull_up: PULL,
  lat_pulldown: PULL,
  seated_cable_row: ROW,
  row_machine: ROW,
  barbell_row: HEAVY_ROW,
  dumbbell_row: ROW,
  t_bar_row: HEAVY_ROW,
  straight_arm_pulldown: work(["lats"], ["triceps", "abs"]),
  back_extension: work(["lower_back"], ["glutes", "hamstrings"]),
  superman: work(["lower_back"], ["glutes", "hamstrings"]),
  back_squat: SQUAT,
  front_squat: work(["quads"], ["glutes", "abs", "lower_back"]),
  smith_squat: SQUAT,
  leg_press: work(["quads"], ["glutes", "hamstrings"]),
  hack_squat: work(["quads"], ["glutes"]),
  leg_extension: work(["quads"]),
  leg_curl: work(["hamstrings"], ["calves"]),
  romanian_deadlift: work(["hamstrings", "glutes"], ["lower_back"]),
  lunge: SPLIT,
  bulgarian_split_squat: SPLIT,
  step_up: work(["quads", "glutes"], ["hamstrings", "calves"]),
  hip_thrust: work(["glutes"], ["hamstrings"]),
  glute_machine: work(["glutes"], ["hamstrings"]),
  hip_abduction: work(["abductors"], ["glutes"]),
  hip_adduction: work(["adductors"]),
  standing_calf_raise: work(["calves"]),
  seated_calf_raise: work(["calves"]),
  bodyweight_squat: SPLIT,
  glute_bridge: work(["glutes"], ["hamstrings", "lower_back"]),
  overhead_press: SHOULDER_PRESS,
  dumbbell_shoulder_press: SHOULDER_PRESS,
  shoulder_press_machine: SHOULDER_PRESS,
  lateral_raise: work(["shoulders"], ["traps"]),
  front_raise: work(["shoulders"], ["chest"]),
  rear_delt_fly: REAR,
  reverse_pec_deck: REAR,
  face_pull: REAR,
  upright_row: work(["shoulders"], ["traps", "biceps"]),
  shrug: work(["traps"], ["forearms"]),
  barbell_curl: CURL,
  dumbbell_curl: CURL,
  hammer_curl: CURL,
  preacher_curl: CURL,
  cable_curl: CURL,
  biceps_curl_machine: CURL,
  triceps_pushdown: EXTENSION,
  skull_crusher: EXTENSION,
  overhead_triceps_extension: EXTENSION,
  close_grip_bench_press: work(["triceps"], ["chest", "shoulders"]),
  triceps_machine: EXTENSION,
  wrist_curl: work(["forearms"]),
  crunch: CRUNCH,
  ab_crunch_machine: CRUNCH,
  cable_crunch: CRUNCH,
  hanging_leg_raise: CRUNCH,
  russian_twist: work(["obliques"], ["abs"]),
  ab_wheel: work(["abs"], ["shoulders", "lats"]),
  plank: work(["abs"], ["obliques", "shoulders"]),
  side_plank: work(["obliques"], ["abs", "shoulders"]),
  mountain_climber: work(["abs"], ["shoulders", "quads", "obliques"]),
  wall_sit: work(["quads"], ["glutes", "calves"]),
  power_clean: work(
    ["quads", "glutes", "traps"],
    ["hamstrings", "lower_back", "shoulders", "calves"],
  ),
  snatch: work(["quads", "glutes", "shoulders"], ["hamstrings", "traps", "lower_back"]),
  kettlebell_swing: work(["glutes", "hamstrings"], ["lower_back", "shoulders", "abs"]),
  farmer_carry: work(["forearms", "traps"], ["abs", "quads", "calves"]),
  burpee: work(["quads", "chest"], ["shoulders", "triceps", "abs", "glutes"]),
  box_jump: work(["quads", "glutes"], ["calves", "hamstrings"]),
  battle_ropes: work(["shoulders"], ["forearms", "abs", "lats"]),
  treadmill: RUN,
  curved_treadmill: RUN,
  exercise_bike: BIKE,
  spin_bike: BIKE,
  recumbent_bike: BIKE,
  air_bike: work(["quads"], ["glutes", "calves", "shoulders", "chest"]),
  elliptical: CLIMB,
  rowing_machine: work(
    ["lats", "quads"],
    ["glutes", "hamstrings", "biceps", "lower_back"],
  ),
  ski_machine: work(["lats", "triceps"], ["abs", "shoulders"]),
  stair_climber: CLIMB,
  stepper: CLIMB,
  vertical_climber: work(
    ["quads", "lats"],
    ["glutes", "shoulders", "biceps", "calves"],
  ),
  arm_ergometer: work(["shoulders"], ["biceps", "triceps", "chest"]),
  jump_rope: work(["calves"], ["quads", "shoulders", "forearms"]),
};

/** What an exercise of the catalog works; null for one the user named. */
export function musclesOf(exercise: { key: string } | string): Worked | null {
  const key = typeof exercise === "string" ? exercise : exercise.key;
  return MUSCLES_OF[key] ?? null;
}

/** The side the small body shows: where the first main muscle is. */
export function sideOf(worked: Worked): BodySide {
  return MUSCLE_SIDE[worked.primary[0]];
}

/** The names of `muscles` in a line; German writes its nouns with a
 * capital anywhere, the others only at the start of the line. */
function listed(
  muscles: readonly Muscle[],
  language: Language,
  capital: boolean,
): string {
  return muscles
    .map((muscle, index) => {
      const name = muscleName(muscle, language);
      return language === "de" || (capital && index === 0) ? name : name.toLowerCase();
    })
    .join(", ");
}

/** «Chest» or «Quads, glutes»: the names of `muscles`, in `language`;
 * without `capital`, as they go on after other words. */
export function muscleNames(
  muscles: readonly Muscle[],
  language: Language,
  { capital = true }: { capital?: boolean } = {},
): string {
  return listed(muscles, language, capital);
}

/** What the screen reader says for the body of an exercise: «Main muscles:
 * chest. Also: shoulders, triceps.», or the main ones alone. */
export function musclesLabel(
  worked: Worked,
  language: Language,
  { secondary = true }: { secondary?: boolean } = {},
): string {
  const main = `${muscleWord("main", language)}: ${listed(worked.primary, language, false)}.`;
  if (!secondary || worked.secondary.length === 0) {
    return main;
  }
  return `${main} ${muscleWord("also", language)}: ${listed(worked.secondary, language, false)}.`;
}
