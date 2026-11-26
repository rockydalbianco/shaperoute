import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { sessionEnded } from "../account/messages";
import type { Account } from "../account/useAccount";
import type { AccountOutcome } from "../api/accounts";
import {
  fetchNotifications,
  fetchUnread,
  isBellMissing,
} from "../api/notificationList";

/**
 * The bell of the header (TASK-367 part C, ADR-0311): how many lines of the
 * list are unread, and the list over the app. «Profile» holds it, as it
 * holds the account; the header shows it.
 */
export type BellDoor = {
  apiUrl: string | null;
  account: Pick<Account, "state" | "sessionEnded"> | null;
  /** The unread lines; null while there is no bell to show: no account, a
   * server without the list, or no answer yet. */
  unread: number | null;
  /** The list is over the app. */
  shown: boolean;
  open: () => void;
  close: () => void;
  /** The list was read: no unread lines until the server says more. */
  read: () => void;
};

const NO_BELL: BellDoor = {
  apiUrl: null,
  account: null,
  unread: null,
  shown: false,
  open: () => {},
  close: () => {},
  read: () => {},
};

export const BellContext = createContext<BellDoor>(NO_BELL);

export function useBell(): BellDoor {
  return useContext(BellContext);
}

/** How often the app asks while it is open (ADR-0311). The number alone is
 * light (TASK-499), but a server of before answers with a page and the
 * actors' pictures: the time between two questions stays. */
export const BELL_EVERY_MS = 5 * 60_000;

type Options = {
  fetchFn?: typeof fetch;
  key?: string | null;
  /** The time between two questions; the tests give their own. */
  everyMs?: number;
};

/** The number of one account: another token's is nobody's. */
type Held = { token: string; unread: number };

/**
 * The bell of the account, for «Profile» to hand to the header. The number
 * is asked when the account is known, every BELL_EVERY_MS while the app is
 * on screen, when it comes back to it, and when the list closes: the number
 * alone (TASK-499), never the list, which is read when the bell is opened.
 * A server of before has no number alone: it is asked once, then the first
 * page gives the number as it did. Without an answer the last number stays;
 * a server without the list is asked once, and the bell stays away: never
 * an error for a number.
 */
export function useBellOf(
  baseUrl: string | null,
  account: Pick<Account, "state" | "sessionEnded">,
  options: Options = {},
): BellDoor {
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [held, setHeld] = useState<Held | null>(null);
  const [shown, setShown] = useState(false);
  // Asked again when the list closes: the effect below runs once more.
  const [asks, setAsks] = useState(0);
  const { fetchFn, key, everyMs = BELL_EVERY_MS } = options;
  // A server without the list: asked once for this token, then never again.
  const off = useRef<string | null>(null);
  // A server with the list and not its number alone (before TASK-499):
  // asked once for this token, then the first page as before.
  const noCount = useRef<string | null>(null);

  useEffect(() => {
    if (token === null || baseUrl === null || off.current === token) {
      return;
    }
    let live = true;
    let onScreen = true;
    /** The number is said, or the session is over; else the last stays. */
    const said = (outcome: AccountOutcome<{ unread: number }>) => {
      if (outcome.kind === "ok") {
        setHeld({ token, unread: outcome.value.unread });
      } else if (sessionEnded(outcome)) {
        onSessionEnded(token);
      }
    };
    const askList = () => {
      void fetchNotifications(baseUrl, token, null, { fetchFn, key }).then(
        (outcome) => {
          if (!live) {
            return;
          }
          if (isBellMissing(outcome)) {
            off.current = token;
          } else {
            said(outcome);
          }
        },
      );
    };
    const ask = () => {
      if (noCount.current === token) {
        askList();
        return;
      }
      void fetchUnread(baseUrl, token, { fetchFn, key }).then((outcome) => {
        if (!live) {
          return;
        }
        if (isBellMissing(outcome)) {
          noCount.current = token;
          askList();
        } else {
          said(outcome);
        }
      });
    };
    ask();
    const timer = setInterval(() => {
      if (onScreen && off.current !== token) {
        ask();
      }
    }, everyMs);
    const subscription = AppState.addEventListener("change", (next) => {
      const was = onScreen;
      onScreen = next === "active";
      if (onScreen && !was && off.current !== token) {
        ask();
      }
    });
    return () => {
      live = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [asks, baseUrl, everyMs, fetchFn, key, onSessionEnded, token]);

  // Logged out, or another account: the list of the one before closes.
  const [openedBy, setOpenedBy] = useState(token);
  if (openedBy !== token) {
    setOpenedBy(token);
    setShown(false);
  }

  const unread = held !== null && held.token === token ? held.unread : null;
  const open = useCallback(() => setShown(true), []);
  const close = useCallback(() => {
    setShown(false);
    setAsks((n) => n + 1);
  }, []);
  const read = useCallback(
    () => setHeld((was) => (was === null ? was : { ...was, unread: 0 })),
    [],
  );

  return useMemo(
    () => ({
      apiUrl: baseUrl,
      account,
      unread,
      shown: shown && unread !== null,
      open,
      close,
      read,
    }),
    [account, baseUrl, close, open, read, shown, unread],
  );
}
