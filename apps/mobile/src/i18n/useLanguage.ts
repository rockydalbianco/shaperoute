import { useSyncExternalStore } from "react";

import { appLanguage, subscribeLanguage } from "./language";
import type { Language } from "./languages";

/**
 * The language the app is shown in, and a new render each time «Settings»
 * changes it (TASK-210). The app's root calls it, so the whole app follows.
 */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeLanguage, appLanguage);
}
