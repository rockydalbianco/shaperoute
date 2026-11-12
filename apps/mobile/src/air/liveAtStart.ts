import { useEffect, useRef, useSyncExternalStore } from "react";
import { Share } from "react-native";

import { liveShareMessage } from "../liveShare/LiveShareButton";
import { startLiveShare } from "../liveShare/liveShareStore";
import { runControl, subscribeRunControl } from "../navigation/runControl";
import { useFollowsDoor } from "../social/followsDoor";
import { type KeptList, keptList } from "../storage/keptList";

/**
 * «Share live at start» (TASK-305 part R5b, ADR-0352 «precisazione»; the
 * user's choice of 2026-11-12, «Come l'ultima volta»): with it on, at the
 * end of a flight's countdown MuW makes the live link and opens the phone's
 * share sheet with it, as «Share live» does by hand. Off until the pilot
 * turns it on; then as it was left, flight after flight, always shown on
 * «Ready to fly» before the start. Only the link, sent to whom the pilot
 * chooses; in flight «Sharing live» says it is on.
 */

export const LIVE_AT_START_FILE = "flight-live-at-start.json";
const ON = "on";

function isOn(value: unknown): value is string {
  return value === ON;
}

const kept: KeptList<string> = keptList(LIVE_AT_START_FILE, isOn);
/** What the pilot chose; read from the file the first time. */
let chosen: boolean | null = null;
const listeners = new Set<() => void>();

export function liveAtStart(list: KeptList<string> = kept): boolean {
  if (chosen === null) {
    chosen = list.load().includes(ON);
  }
  return chosen;
}

/** Kept for the next flights; in this app run even when the phone refuses
 * the file. */
export function setLiveAtStart(on: boolean, list: KeptList<string> = kept): void {
  chosen = on;
  list.save(on ? [ON] : []);
  for (const listener of listeners) {
    listener();
  }
}

/** For the tests: as at the start of the app. */
export function resetLiveAtStart(): void {
  chosen = null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The switch, for a screen: drawn again when it changes. */
export function useLiveAtStart(): boolean {
  return useSyncExternalStore(subscribe, () => liveAtStart());
}

type Start = typeof startLiveShare;
type ShareSheet = (message: string) => void;

const shareSheet: ShareSheet = (message) => {
  void Share.share({ message }).catch(() => undefined);
};

/**
 * On a flight's screen: when its countdown ends and the switch is on, with
 * an account, the link starts and the share sheet opens. Only at the end of
 * a countdown: a flight taken up again keeps the link it had, or none.
 * Without network nothing is said: «Share live» is there as always.
 */
export function useStartLiveAtStart(
  flight: boolean,
  start: Start = startLiveShare,
  share: ShareSheet = shareSheet,
): void {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const phase = useSyncExternalStore(subscribeRunControl, () => runControl().phase);
  const before = useRef(phase);

  useEffect(() => {
    const was = before.current;
    before.current = phase;
    if (!flight || was !== "countdown" || phase !== "running") {
      return;
    }
    if (!liveAtStart() || apiUrl === null || token === null) {
      return;
    }
    void start({ baseUrl: apiUrl, token }, "paragliding").then((outcome) => {
      if (outcome.kind === "started") {
        share(liveShareMessage(outcome.url));
      }
    });
  }, [flight, phase, apiUrl, token, start, share]);
}
