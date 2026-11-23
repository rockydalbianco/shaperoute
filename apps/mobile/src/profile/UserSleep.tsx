import type { SleepSummary } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";

import { sessionEnded } from "../account/messages";
import { fetchProfileSleep } from "../api/sleepProfile";
import { sleepPostsOn } from "../health/sleepModules";
import { ProfileSleep } from "./ProfileSleep";

type Props = {
  apiUrl: string;
  token: string;
  /** The `public_id` of the profile. */
  publicId: string;
  onSessionEnded: (token: string) => void;
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * The sleep on another member's profile (TASK-467 part B3): the latest
 * night they shared with «Share», read from the API. Nothing without one:
 * a night not shared is to anyone else as one that is not there. Nothing,
 * and no request, while the sleep is off (`sleepPostsOn`, until part C).
 */
export function UserSleep({
  apiUrl,
  token,
  publicId,
  onSessionEnded,
  fetchFn,
  apiKey,
}: Props) {
  const on = sleepPostsOn();
  const asked = `${token} ${publicId}`;
  // The night of one profile, asked with one token.
  const [answer, setAnswer] = useState<{ asked: string; night: SleepSummary } | null>(
    null,
  );

  useEffect(() => {
    if (!on) {
      return;
    }
    let live = true;
    void fetchProfileSleep(apiUrl, token, publicId, { fetchFn, key: apiKey }).then(
      (outcome) => {
        if (!live) {
          return;
        }
        if (outcome.kind === "ok") {
          setAnswer({ asked, night: outcome.value });
        } else if (sessionEnded(outcome)) {
          onSessionEnded(token);
        }
      },
    );
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, asked, fetchFn, on, onSessionEnded, publicId, token]);

  if (!on || answer === null || answer.asked !== asked) {
    return null;
  }
  return <ProfileSleep night={answer.night} />;
}
