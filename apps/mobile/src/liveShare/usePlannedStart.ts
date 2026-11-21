import type { LiveItem } from "@shaperoute/shared-types";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Alert } from "react-native";

import { t } from "../i18n";
import { runControl, subscribeRunControl } from "../navigation/runControl";
import { useFollowsDoor } from "../social/followsDoor";
import { fetchMyPlannedLives, type LiveApiOptions } from "./liveShareApi";
import { liveShareStatus, startPlannedLive } from "./liveShareStore";

/** The planned live a recording starting now could be: one's own, within
 * its hours (`can_start`), the soonest first. */
export function plannedNow(lives: readonly LiveItem[]): LiveItem | null {
  return lives.find((live) => live.can_start && live.planned_live_id !== null) ?? null;
}

/** «Start live “…”?» (the user's choice 3; texts approved on 2026-11-12):
 * never by itself, a yes or a no. */
export function askToStart(live: LiveItem, onStart: () => void): void {
  Alert.alert(
    t('Start live "{title}"?', { title: live.title ?? "" }),
    live.audience_feed === "everyone"
      ? t("Everyone can follow you now.")
      : t("Your followers can follow you now."),
    [
      { text: t("Not this time"), style: "cancel" },
      { text: t("Start live"), onPress: onStart },
    ],
  );
}

/**
 * On the recording screen (TASK-468 part B2b1): when a countdown ends, with
 * an account and nothing shared yet, one's own planned live within its
 * hours is offered (`askToStart`). A yes starts its share, with its
 * audience and heart rate. No network or none to start: nothing is said.
 */
export function usePlannedStart(fetchFn?: typeof fetch, apiKey?: string | null): void {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const phase = useSyncExternalStore(subscribeRunControl, () => runControl().phase);
  const before = useRef(phase);

  useEffect(() => {
    const was = before.current;
    before.current = phase;
    if (was !== "countdown" || phase !== "running") {
      return;
    }
    if (apiUrl === null || token === null || liveShareStatus().kind !== "off") {
      return;
    }
    const api: LiveApiOptions = { baseUrl: apiUrl, token, fetchFn, key: apiKey };
    void fetchMyPlannedLives(api).then((answer) => {
      const live = answer.kind === "ok" ? plannedNow(answer.value) : null;
      if (live !== null && live.planned_live_id !== null) {
        const id = live.planned_live_id;
        askToStart(live, () => void startPlannedLive(api, id));
      }
    });
  }, [phase, apiUrl, token, fetchFn, apiKey]);
}
