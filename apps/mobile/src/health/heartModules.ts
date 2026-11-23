import { Platform, TurboModuleRegistry } from "react-native";

import {
  appleHeartReader,
  type HeartKitModule,
  type HeartReader,
} from "./heartSamples";

type AppleLibrary = typeof import("@kingstinct/react-native-healthkit");

/**
 * The reader of the heart rate (TASK-409 part B) where the build has
 * Apple Health's native code, as healthModules.ts for writing: the 1.0.1
 * and later on the iPhone, whose NSHealthShareUsageDescription already
 * speaks of the heart rate. The 1.0 (build 7), Expo Go and Android have
 * none: null, and nothing is ever asked there. Health Connect reads after
 * TASK-321 C.
 */

let shared: HeartReader | null | undefined;

function appleReader(): HeartReader | null {
  if (TurboModuleRegistry.get("NitroModules") === null) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const library = require("@kingstinct/react-native-healthkit") as AppleLibrary;
    // What MuW uses of it, checked against the library's own types.
    const kit: HeartKitModule = library;
    return appleHeartReader(kit);
  } catch {
    return null;
  }
}

/** The phone's reader of the heart rate, made the first time; null without
 * the native module. */
export function heartReader(): HeartReader | null {
  if (shared === undefined) {
    shared = Platform.OS === "ios" ? appleReader() : null;
  }
  return shared;
}
