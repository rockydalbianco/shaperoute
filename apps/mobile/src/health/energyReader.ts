/**
 * What the phone's health store says of the energy a person used (TASK-489
 * part C2, ADR-0397): the workouts other apps recorded and the active
 * energy of a stretch of time, read from Apple Health on the phone.
 *
 * It is the one reader of workouts in `health/` (agreed with TASK-312 D on
 * 2026-11-23): whoever needs the workouts of the other apps, as the import
 * «From Apple Health» will, reads them through `workouts`. Nothing here is
 * kept, sent or shown: the reader only reads, each time it is asked.
 *
 * Apple Health never says whether reading was refused: a permission turned
 * off reads as no workouts and no energy.
 */

/** A workout as Apple Health has it, whoever wrote it. */
export type HealthWorkout = {
  /** Health's own id of the workout. */
  id: string;
  /** HKWorkoutActivityType: 37 running, 13 cycling, 50 strength training… */
  activityType: number;
  startMs: number;
  endMs: number;
  /** Its active energy as the app that wrote it saved it; null for none. */
  kcal: number | null;
  /** Its distance in metres; null for none. */
  metres: number | null;
  /** The app that wrote it: its name as Health shows it, and its bundle. */
  sourceName: string | null;
  sourceBundleId: string | null;
  /** HKSyncIdentifier, which MuW sets to an activity's own key when it
   * writes one (appleHealth.ts); null without it. */
  syncId: string | null;
};

export type HealthEnergyReader = {
  store: "apple";
  /** Whether the phone has a health store at all. */
  available: () => Promise<boolean>;
  /** Opens the phone's sheet for reading workouts and active energy. It
   * resolves when the sheet goes, whatever was answered. */
  ask: () => Promise<void>;
  /** The workouts that began in [fromMs, toMs), the earliest first. */
  workouts: (fromMs: number, toMs: number) => Promise<HealthWorkout[]>;
  /** The active energy of [fromMs, toMs) in kilocalories, each source
   * counted once as Health does; null when Health has none. */
  activeEnergy: (fromMs: number, toMs: number) => Promise<number | null>;
};

export const WORKOUT_TYPE = "HKWorkoutTypeIdentifier";
export const ACTIVE_ENERGY_TYPE = "HKQuantityTypeIdentifierActiveEnergyBurned";

/** What the reader asks to read, and nothing else. */
export const ENERGY_READ_TYPES = [WORKOUT_TYPE, ACTIVE_ENERGY_TYPE] as const;

type Amount = { readonly unit: string; readonly quantity: number };

/** A workout as the library gives it: what the reader uses of it. */
export type KitWorkout = {
  readonly uuid: string;
  readonly workoutActivityType: number;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly totalEnergyBurned?: Amount;
  readonly totalDistance?: Amount;
  readonly metadata?: { readonly [key: string]: unknown };
  readonly sourceRevision?: {
    readonly source?: { readonly name?: string; readonly bundleIdentifier?: string };
  };
};

/** What MuW uses of `@kingstinct/react-native-healthkit` to read energy. */
export type EnergyKitModule = {
  isHealthDataAvailable(): boolean;
  requestAuthorization(request: {
    toRead: readonly (typeof ENERGY_READ_TYPES)[number][];
  }): Promise<boolean>;
  queryWorkoutSamples(options: {
    filter: { date: { startDate: Date; endDate: Date } };
    limit: number;
    ascending: boolean;
  }): Promise<readonly KitWorkout[]>;
  queryStatisticsForQuantity(
    identifier: typeof ACTIVE_ENERGY_TYPE,
    statistics: readonly ["cumulativeSum"],
    options: {
      filter: { date: { startDate: Date; endDate: Date } };
      unit: "kcal";
    },
  ): Promise<{ readonly sumQuantity?: Amount }>;
};

const JOULES_IN_A_KCAL = 4184;

/** An energy in kilocalories, whatever unit Health gave it in; null when it
 * is not a number or the unit is not one of energy. */
export function kcalOf(amount: Amount | undefined): number | null {
  if (amount === undefined || !Number.isFinite(amount.quantity)) {
    return null;
  }
  switch (amount.unit) {
    case "kcal":
    case "Cal":
      return amount.quantity;
    case "cal":
      return amount.quantity / 1000;
    case "kJ":
      return (amount.quantity * 1000) / JOULES_IN_A_KCAL;
    case "J":
      return amount.quantity / JOULES_IN_A_KCAL;
    default:
      return null;
  }
}

const METRES_IN = { m: 1, km: 1000, mi: 1609.344, yd: 0.9144, ft: 0.3048 } as const;

/** A distance in metres; null when it is not a number or a length. */
export function metresOf(amount: Amount | undefined): number | null {
  if (amount === undefined || !Number.isFinite(amount.quantity)) {
    return null;
  }
  const one = (METRES_IN as { readonly [unit: string]: number | undefined })[
    amount.unit
  ];
  return one === undefined ? null : amount.quantity * one;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** A workout of the library as the app reads it; null when its moments are
 * not moments. */
export function workoutFrom(found: KitWorkout): HealthWorkout | null {
  const startMs = found.startDate.getTime();
  const endMs = found.endDate.getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return null;
  }
  return {
    id: found.uuid,
    activityType: found.workoutActivityType,
    startMs,
    endMs,
    kcal: kcalOf(found.totalEnergyBurned),
    metres: metresOf(found.totalDistance),
    sourceName: text(found.sourceRevision?.source?.name),
    sourceBundleId: text(found.sourceRevision?.source?.bundleIdentifier),
    syncId: text(found.metadata?.HKSyncIdentifier),
  };
}

/** Apple Health as a reader of workouts and active energy. */
export function appleEnergyReader(kit: EnergyKitModule): HealthEnergyReader {
  return {
    store: "apple",
    available: async () => kit.isHealthDataAvailable(),
    ask: async () => {
      await kit.requestAuthorization({ toRead: [...ENERGY_READ_TYPES] });
    },
    workouts: async (fromMs, toMs) => {
      const found = await kit.queryWorkoutSamples({
        filter: { date: { startDate: new Date(fromMs), endDate: new Date(toMs) } },
        // All of them: a day has a handful.
        limit: 0,
        ascending: true,
      });
      return found
        .map(workoutFrom)
        .filter(
          (workout): workout is HealthWorkout =>
            workout !== null && workout.startMs >= fromMs && workout.startMs < toMs,
        );
    },
    activeEnergy: async (fromMs, toMs) => {
      const sum = await kit.queryStatisticsForQuantity(
        ACTIVE_ENERGY_TYPE,
        ["cumulativeSum"],
        {
          filter: { date: { startDate: new Date(fromMs), endDate: new Date(toMs) } },
          unit: "kcal",
        },
      );
      const kcal = kcalOf(sum.sumQuantity);
      return kcal !== null && kcal > 0 ? kcal : null;
    },
  };
}
