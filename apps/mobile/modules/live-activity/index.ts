import { requireOptionalNativeModule } from "expo";

/**
 * The Live Activity of a run (TASK-401 part B): the Swift module in `ios/`,
 * present from the 1.0.2 build. Null on a build without it (1.0.1, Expo Go,
 * Android, the tests): the run then writes its directions in a notification
 * (part A).
 */
export type NativeLiveActivity = {
  isAvailable(): boolean;
  /** `colors` and `state` as JSON, as MuWRunAttributes reads them. */
  start(colors: string, state: string): Promise<boolean>;
  update(state: string): Promise<void>;
  end(state: string, dismissAfterSeconds: number): Promise<void>;
};

export function nativeLiveActivity(): NativeLiveActivity | null {
  return requireOptionalNativeModule<NativeLiveActivity>("MuWLiveActivity");
}
