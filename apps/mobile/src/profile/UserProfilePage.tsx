import type { PublicProfile } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { accountProblem, NO_API, sessionEnded } from "../account/messages";
import type { Account } from "../account/useAccount";
import type { AccountOutcome } from "../api/accounts";
import { fetchProfile, profilePhotoUri } from "../api/profiles";
import { color, fontSize, space } from "../theme/tokens";
import { ProfileHeader } from "./ProfileHeader";

type Failed = Exclude<AccountOutcome<unknown>, { kind: "ok" }>;

type Props = {
  /** The API the account talks to (ADR-0031); null if unknown. */
  apiUrl: string | null;
  account: Pick<Account, "state" | "sessionEnded">;
  /** The `public_id` of the profile: never the email or the internal id. */
  publicId: string;
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/** What the page shows of a profile asked for. */
type Shown =
  { kind: "ready"; profile: PublicProfile } | { kind: "failed"; problem: string };

/** The answer for one profile, asked with one token. */
type Answer = { asked: string; shown: Shown };

export const SIGN_IN_TO_SEE = "Log in to see the profiles of the others.";
export const NO_SUCH_PROFILE = "This profile is not available.";

/** «12 drawings», «1 drawing». */
export function drawingsText(drawings: number): string {
  return `${drawings} ${drawings === 1 ? "drawing" : "drawings"}`;
}

/** A profile that could not be shown, in words. */
export function profileViewProblem(failed: Failed): string {
  // Unknown, deleted, or an API older than TASK-116 that has no profiles.
  if (failed.kind === "api_error" && failed.code === "http_error") {
    return NO_SUCH_PROFILE;
  }
  return accountProblem(failed);
}

/**
 * Another member's profile, read only (TASK-116, ADR-0128): the picture,
 * the name, the bio and how many drawings they published. Never the email:
 * the API does not send it. Nothing in the app opens it yet: where it opens
 * from (the feed, a like, a comment) is the user's choice.
 */
export function UserProfilePage({ apiUrl, account, publicId, fetchFn, apiKey }: Props) {
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const asked = `${token ?? ""} ${publicId}`;
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    if (token === null || apiUrl === null) {
      return;
    }
    let live = true;
    void fetchProfile(apiUrl, token, publicId, { fetchFn, key: apiKey }).then(
      (outcome) => {
        if (!live) {
          return;
        }
        if (outcome.kind === "ok") {
          setAnswer({ asked, shown: { kind: "ready", profile: outcome.value } });
          return;
        }
        setAnswer({
          asked,
          shown: { kind: "failed", problem: profileViewProblem(outcome) },
        });
        if (sessionEnded(outcome)) {
          onSessionEnded(token);
        }
      },
    );
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, asked, fetchFn, onSessionEnded, publicId, token]);

  if (token === null) {
    return <Text style={styles.message}>{SIGN_IN_TO_SEE}</Text>;
  }
  if (apiUrl === null) {
    return <Text style={styles.message}>{NO_API}</Text>;
  }
  const shown = answer !== null && answer.asked === asked ? answer.shown : null;
  if (shown === null) {
    return <Text style={styles.message}>Loading the profile…</Text>;
  }
  if (shown.kind === "failed") {
    return <Text style={[styles.message, styles.problem]}>{shown.problem}</Text>;
  }
  const { profile } = shown;
  return (
    <View style={styles.page}>
      <ProfileHeader
        username={profile.username}
        bio={profile.bio}
        photo={profilePhotoUri(profile)}
        detail={drawingsText(profile.drawings)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: space.lg,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.body,
    textAlign: "center",
  },
  problem: {
    color: color.error,
  },
});
