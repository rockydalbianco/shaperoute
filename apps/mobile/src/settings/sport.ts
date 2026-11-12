import {
  ACTIVITIES,
  type Activity,
  RECORD_ACTIVITIES,
  type RunActivity,
} from "@shaperoute/shared-types";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";

import { t } from "../i18n";
import { profileOf } from "../sports";

/** What a route is for: a run, a bike ride since TASK-190, paddling on a
 * lake or the sea since TASK-191 (a canoe, a kayak, a SUP), a walk on the
 * foot network of a run (TASK-371 part B, ADR-0315), «Soon» until the server
 * walks, a hike on the trails of its own network (TASK-377 part B,
 * ADR-0321), «Soon» until the server hikes, a gravel ride on the bike's
 * network or an MTB ride on the trails of its own (TASK-378 part B,
 * ADR-0322) since the server has them, or swimming in open water
 * (TASK-323, ADR-0283) since the server swims.
 * Paragliding (TASK-305 R2, ADR-0375) is a flight recorded without a
 * shape, never a route. A day of alpine skiing («Ski») or of cross-country skiing is
 * recorded without a shape (TASK-375, ADR-0319): `recordOnly`, and so is
 * a ski tour («Ski touring», TASK-415 part B, ADR-0344). A workout
 * at the gym («Gym», TASK-385 part B, ADR-0327) has no route and no GPS:
 * «Draw» offers only «Start workout». */
export type Sport =
  | "run"
  | "bike"
  | "paddle"
  | "walk"
  | "hike"
  | "gravel"
  | "mtb"
  | "roller"
  | "swim"
  | "ski"
  | "xc_ski"
  | "skimo"
  | "gym"
  | "paragliding";

export type SportOption = {
  id: Sport;
  emoji: string;
  /** In English: where it is shown, `t(name)` (TASK-210). */
  name: string;
  /**
   * False until the Route Engine draws routes for it: «Settings» shows it
   * with «Soon» and it cannot be chosen. The task that brings the sport
   * turns this on and gives it its activity (activityOf).
   */
  ready: boolean;
  /**
   * Recorded without a shape (TASK-375, ADR-0319): «Draw» offers only
   * «Record your day», the Route Engine never sees it, and the run is saved
   * as its runActivityOf.
   */
  recordOnly?: boolean;
  /**
   * On in Expo Go and `preview` while `ready` is still false: tried there
   * before the store builds have it, which leave it out as any sport not
   * ready (shownSports). The swim went this way until TASK-387 was on the
   * server (TASK-323, ADR-0283); no sport does now.
   */
  preview?: boolean;
};

/**
 * What a run of each sport is saved as (TASK-375, ADR-0319), and what «Draw»
 * asks the API for when it is one of the activities of the API (activityOf).
 * Paragliding has none yet: wherever the sports are told apart it goes as a
 * run.
 */
const ACTIVITY: { readonly [S in Sport]?: RunActivity } = {
  run: "running",
  bike: "cycling",
  paddle: "paddling",
  swim: "swimming",
  walk: "walking",
  hike: "hiking",
  gravel: "gravel_biking",
  mtb: "mountain_biking",
  roller: "inline_skating",
  ski: "skiing",
  xc_ski: "xc_skiing",
  skimo: "ski_touring",
  gym: "gym",
  paragliding: "paragliding",
};

/** A sport of «Settings» as its profile says it (TASK-376 part B3c,
 * ADR-0320): emoji and name, and recorded without a shape when its activity
 * is one of those. «Settings» says only whether it is ready. */
function fromProfile(id: Sport, ready: boolean): SportOption {
  const activity = ACTIVITY[id];
  if (activity === undefined) {
    throw new Error(`no activity for ${id}`);
  }
  const { emoji, name } = profileOf(activity);
  const recordOnly = (RECORD_ACTIVITIES as readonly RunActivity[]).includes(activity);
  return recordOnly
    ? { id, emoji, name, ready, recordOnly }
    : { id, emoji, name, ready };
}

/** Every sport, in the order they are shown; the ones not ready included.
 * By family, from the easiest (TASK-371, the user's «prima walk poi run,
 * bicycle, paddle, swim»): on foot, on wheels, on the water, on the snow,
 * then the gym and the ones still «Soon». */
export const ALL_SPORTS: readonly SportOption[] = [
  // On foot. A walk is asked as "walking" (activityOf), 1-30 km; on since
  // the server has TASK-371 part A and its migration 0043, the user's «cosa
  // aspettiamo ad attivare Walk» (2026-11-06). A hike is asked as "hiking",
  // 1-30 km on the server's own network; on since the server has TASK-377
  // part A and its migration 0051, the user's «acceso appena pronto».
  fromProfile("walk", true),
  fromProfile("run", true),
  fromProfile("hike", true),
  // On wheels. Gravel and MTB are asked as "gravel_biking" and
  // "mountain_biking" (activityOf), 10-30 km each; on since the server has
  // TASK-378 part A and its migration 0052, the user's «Sì, accendili».
  fromProfile("bike", true),
  fromProfile("gravel", true),
  fromProfile("mtb", true),
  // Inline skating is asked as "inline_skating" (activityOf), 5-30 km on
  // the server's own network (TASK-380 part B); on since the server has part
  // A and its migration 0055, the user's «appena pronto».
  fromProfile("roller", true),
  // On the water. The swim is asked as "swimming" since TASK-323 C2
  // (activityOf); on since the server swims (TASK-323, 2026-11-04).
  fromProfile("paddle", true),
  fromProfile("swim", true),
  // On the snow, saved as "skiing" and "xc_skiing" (runActivityOf). The
  // alpine ski is on since TASK-375 D4: the server has parts A-D
  // (migrations 0044 and 0048) and the day its numbers, lifts and pistes.
  // The cross-country ski is on too, with its distance, pace and climb
  // (TASK-375 C1): the server has kept "xc_skiing" since 0044, the user's
  // «rendile disponibili» (2026-11-12).
  fromProfile("ski", true),
  fromProfile("xc_ski", true),
  // Ski touring, saved as "ski_touring": on since its phases and its VAM
  // (TASK-415 part B), the user's «Acceso con a e b» (2026-11-07), with
  // the OTA that carries them; the server has had part A and its migration
  // 0057 since 2026-11-08.
  fromProfile("skimo", true),
  // Saved as "gym" (runActivityOf), without a track (TASK-385 part B); on in
  // the store builds too, the user's «ok accendi» (2026-11-05): the server
  // keeps its posts from the apps that cannot read them (X-MuW-Reads).
  fromProfile("gym", true),
  // A flight, saved as "paragliding", recorded without a shape (TASK-305
  // part R2, ADR-0375): on with its numbers of the air and its notice; the
  // server has had part R1 and its migration 0069 since 2026-11-12.
  fromProfile("paragliding", true),
];

/** The sports offered only once «Settings» has them ready. */
const OFFERED_WHEN_READY: { readonly [A in Activity]?: Sport } = {
  walking: "walk",
  hiking: "hike",
  gravel_biking: "gravel",
  mountain_biking: "mtb",
  inline_skating: "roller",
};

/**
 * Whether `activity` is offered where a run's sport is chosen or looked for
 * (the form to publish, the search's filters): a walk once «Walk» is ready,
 * the server keeping walks (TASK-371), so the two come together, a hike
 * once «Hike» is (TASK-377), a gravel or an MTB ride once «Gravel» or «MTB»
 * is (TASK-378), a skate once «Roller» is (TASK-380); every other as before.
 */
export function activityOffered(
  activity: Activity,
  sports: readonly SportOption[] = ALL_SPORTS,
): boolean {
  const sport = OFFERED_WHEN_READY[activity];
  return sport === undefined || sports.some((s) => s.id === sport && s.ready);
}

/**
 * True in the App Store and Google Play builds, and in the updates made for
 * them: their runtime version is the fingerprint of the native code
 * (app.config.ts with APP_VARIANT=production), never the "exposdk:" one of
 * app.json that Expo Go and `preview` use (ADR-0078, TASK-318).
 */
export function isStoreBuild(
  config: { runtimeVersion?: unknown } | null | undefined = Constants.expoConfig,
): boolean {
  const runtime = config?.runtimeVersion;
  if (runtime === undefined || runtime === null) {
    return false;
  }
  return !(typeof runtime === "string" && runtime.startsWith("exposdk:"));
}

/** `sports` as this app shows them: a store build leaves out the ones not
 * ready, so its users are promised no «Soon» (TASK-318, ADR-0278); Expo Go
 * and `preview` turn on the ones tried there first (`preview`, TASK-323). */
export function shownSports(
  sports: readonly SportOption[],
  store: boolean,
): readonly SportOption[] {
  if (store) {
    return sports.filter((option) => option.ready);
  }
  return sports.map((option) =>
    option.preview === true && !option.ready ? { ...option, ready: true } : option,
  );
}

/** The sports of «Settings» and of the sport menu of «Draw», in order. */
export const SPORTS: readonly SportOption[] = shownSports(ALL_SPORTS, isStoreBuild());

export const DEFAULT_SPORT: Sport = "run";
export const SPORT_FILE = "sport.json";

/** True when `sport` is one of `sports` and its routes can be drawn. */
export function canChoose(
  sport: unknown,
  sports: readonly SportOption[] = SPORTS,
): sport is Sport {
  return sports.some((option) => option.id === sport && option.ready);
}

/**
 * The sport chosen on this phone; "run" when none was chosen, the file does
 * not read, or the one in it is not ready (any more).
 */
export function loadSport(sports: readonly SportOption[] = SPORTS): Sport {
  try {
    const file = new File(Paths.document, SPORT_FILE);
    if (!file.exists) {
      return DEFAULT_SPORT;
    }
    const data: unknown = JSON.parse(file.textSync());
    const sport =
      typeof data === "object" && data !== null && "sport" in data ? data.sport : null;
    return canChoose(sport, sports) ? sport : DEFAULT_SPORT;
  } catch {
    return DEFAULT_SPORT;
  }
}

/** Told of each sport saved, while the app is open (TASK-190). */
const listeners = new Set<(sport: Sport) => void>();

/** Calls `listener` with each sport saved from now on, until the returned
 * function is called: «Draw» follows «Settings» at once (useSport). */
export function subscribeSport(listener: (sport: Sport) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Keeps the choice for the next opening; a phone that refuses keeps nothing. */
export function saveSport(sport: Sport): void {
  try {
    const file = new File(Paths.document, SPORT_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify({ sport }));
  } catch {
    // The choice still holds while the app is open.
  }
  for (const listener of listeners) {
    listener(sport);
  }
}

/**
 * What «Draw» asks the API for (TASK-190, ADR-0153): a route on the roads a
 * bike may ride for «Bike», a shape on the water for «Paddle» (TASK-191,
 * ADR-0164), a swim within 150 m of the shore for «Open water swim»
 * (TASK-323), a run for «Run»: the sport's activity when the API draws it
 * (TASK-376 part B3c), a run for every other.
 */
export function activityOf(sport: Sport): Activity {
  const activity = ACTIVITY[sport];
  return isPlanned(activity) ? activity : "running";
}

function isPlanned(activity: RunActivity | undefined): activity is Activity {
  return (ACTIVITIES as readonly (RunActivity | undefined)[]).includes(activity);
}

/** True when `sport` is recorded without a shape (TASK-375): «Draw» shows
 * only «Record your day». */
export function isRecordOnly(
  sport: Sport,
  sports: readonly SportOption[] = ALL_SPORTS,
): boolean {
  return sports.some((option) => option.id === sport && option.recordOnly === true);
}

/**
 * What a run of `sport` is saved as (TASK-375, ADR-0319): its activity, so
 * a day on the snow as "skiing" or "xc_skiing", which no route asks, a
 * workout as "gym", a walk as "walking"; a sport without one as a run.
 */
export function runActivityOf(sport: Sport): RunActivity {
  return ACTIVITY[sport] ?? "running";
}

/** The way out of «Draw» with the track only (TASK-149), in the sport's
 * words: «Ride» by bike (TASK-190), «Paddle» on the water (TASK-191),
 * «Walk» on foot (TASK-371), «Hike» on the trails (TASK-377), «Swim» in
 * open water (TASK-323). A gravel or an MTB ride is a ride (TASK-378).
 * «Skate» on inline skates (TASK-380). */
export function withoutRouteLabel(sport: Sport): string {
  switch (sport) {
    case "bike":
    case "gravel":
    case "mtb":
      return t("Ride without a route");
    case "paddle":
      return t("Paddle without a route");
    case "walk":
      return t("Walk without a route");
    case "hike":
      return t("Hike without a route");
    case "roller":
      return t("Skate without a route");
    case "swim":
      return t("Swim without a route");
    case "ski":
    case "xc_ski":
    case "skimo":
      // No shapes on the slopes (TASK-375): the only way to go.
      return t("Record your day");
    case "gym":
      // No route in the gym (TASK-385 part B): the workout's own start.
      return t("Start workout");
    case "paragliding":
      // No shapes in the air yet (TASK-305 parts R): the flight only.
      return t("Record your flight");
    default:
      return t("Run without a route");
  }
}
