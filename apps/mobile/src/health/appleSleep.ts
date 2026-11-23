import { type SleepSample, stageOfAppleValue } from "./sleepNight";
import type { SleepReader } from "./sleepSamples";

/**
 * Apple Health as a reader of the sleep (TASK-467 part C): the samples of
 * its sleep analysis, as `sleepNight.ts` takes them. The only file of MuW
 * that names that type. Reading is asked apart from the heart rate's and
 * only at the user's tap on «Show my sleep from Apple Health», on the
 * «Sleep» card of the profile. The phone never says whether reading was
 * refused: a refusal reads as no samples.
 */

const SLEEP = "HKCategoryTypeIdentifierSleepAnalysis";

/** What MuW uses of `@kingstinct/react-native-healthkit` to read the sleep. */
export type SleepKitModule = {
  isHealthDataAvailable(): boolean;
  requestAuthorization(request: { toRead: readonly [typeof SLEEP] }): Promise<boolean>;
  queryCategorySamples(
    identifier: typeof SLEEP,
    options: {
      filter: { date: { startDate: Date; endDate: Date } };
      limit: number;
      ascending: boolean;
    },
  ): Promise<readonly { startDate: Date; endDate: Date; value: number }[]>;
};

/** Apple Health as a reader of the sleep. */
export function appleSleepReader(kit: SleepKitModule): SleepReader {
  return {
    store: "apple",
    available: async () => kit.isHealthDataAvailable(),
    ask: async () => {
      await kit.requestAuthorization({ toRead: [SLEEP] });
    },
    samples: async (fromMs, toMs) => {
      const found = await kit.queryCategorySamples(SLEEP, {
        filter: { date: { startDate: new Date(fromMs), endDate: new Date(toMs) } },
        // All of them: a watch writes one for every change of stage.
        limit: 0,
        ascending: true,
      });
      const samples: SleepSample[] = [];
      for (const sample of found) {
        // «In bed» says nothing about sleep: left out, as a value not known.
        const stage = stageOfAppleValue(sample.value);
        if (stage !== null) {
          samples.push({
            fromMs: sample.startDate.getTime(),
            toMs: sample.endDate.getTime(),
            stage,
          });
        }
      }
      return samples;
    },
  };
}
