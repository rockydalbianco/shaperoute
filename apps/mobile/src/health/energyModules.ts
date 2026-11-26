import { Platform, TurboModuleRegistry } from "react-native";

import {
  appleEnergyReader,
  type EnergyKitModule,
  type HealthEnergyReader,
} from "./energyReader";

type AppleLibrary = typeof import("@kingstinct/react-native-healthkit");

/**
 * The switch of reading workouts and active energy from Apple Health
 * (TASK-489 part C2), and the phone's reader.
 *
 * **Off, and no reader, until the native build**: the iOS permission text
 * of the builds out today speaks of the heart rate only, so reading the
 * workouts and the active energy needs the build whose text names them
 * (the one sentence for every reader, approved by the user on 2026-11-23,
 * written in `app.json` at the cut of that build), with the privacy
 * paragraph before it. Until then this file loads no health library and
 * asks for no permission, and `energyModules.test.ts` holds it to that.
 */

/** Whether the app may read workouts and active energy. Typed as a
 * boolean, not as the `false` it is, so that what it hides still compiles
 * and is tested. */
export const HEALTH_ENERGY_ON: boolean = false;

/** Apple Health's reader, where the build has the library's native code
 * (as `healthModules.ts`); null in Expo Go and without it. */
function appleReader(): HealthEnergyReader | null {
  if (Platform.OS !== "ios" || TurboModuleRegistry.get("NitroModules") === null) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const library = require("@kingstinct/react-native-healthkit") as AppleLibrary;
    // What MuW uses of it, checked against the library's own types.
    const kit: EnergyKitModule = library;
    return appleEnergyReader(kit);
  } catch {
    return null;
  }
}

let shared: HealthEnergyReader | null | undefined;

/** The phone's reader of workouts and active energy: none in this build. */
export function energyReader(): HealthEnergyReader | null {
  if (!HEALTH_ENERGY_ON) {
    return null;
  }
  if (shared === undefined) {
    shared = appleReader();
  }
  return shared;
}
