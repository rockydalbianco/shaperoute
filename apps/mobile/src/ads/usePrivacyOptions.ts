import { useCallback, useEffect, useState } from "react";

import { privacyOptions } from "./admob";
import type { PrivacyOptions } from "./privacyOptions";

/**
 * Whether «Privacy options» is shown, and what tapping it does (TASK-153).
 * Hidden until Google says it is required, and in Expo Go, where there is
 * no ad network.
 */
export function usePrivacyOptions(options: () => PrivacyOptions = privacyOptions): {
  shown: boolean;
  open: () => void;
} {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let live = true;
    void options()
      .required()
      .then((required) => {
        if (live) {
          setShown(required);
        }
      });
    return () => {
      live = false;
    };
  }, [options]);

  const open = useCallback(() => {
    void options().open();
  }, [options]);

  return { shown, open };
}
