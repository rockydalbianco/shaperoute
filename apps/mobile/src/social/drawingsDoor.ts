import type {
  Drawing,
  DrawingDetail,
  DrawingsPage,
  MyDrawing,
} from "@shaperoute/shared-types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { sessionEnded } from "../account/messages";
import type { Account } from "../account/useAccount";
import type { AccountOutcome } from "../api/accounts";
import {
  type DrawingChoice,
  drawingProblem,
  fetchDrawing,
  fetchMyDrawing,
  fetchMyDrawings,
  fetchUserDrawings,
  saveDrawing,
  worthAgain,
} from "../api/drawings";
import { t } from "../i18n";
import { forgetForDrawing, keepForDrawing, waitingDrawing } from "./drawingOutbox";

/** What the owner chose for a run, as a run of «My activities» shows it. */
export type ChoiceShown =
  /** `waiting`: chosen on this phone, not on the API yet. */
  | { kind: "known"; choice: DrawingChoice; waiting: boolean }
  /** An API from before drawings: nothing to choose. */
  | { kind: "off" }
  | { kind: "failed"; problem: string };

/** What came of a choice. */
export type Chosen =
  | { kind: "saved"; drawing: MyDrawing }
  /** No network: on the phone, it goes with the next one. */
  | { kind: "waiting" }
  | { kind: "failed"; problem: string };

/**
 * The drawings of the account as the whole app reaches them (TASK-117,
 * ADR-0159): «Public» and the title of a run of «My activities», which of
 * its runs are public, the drawings of a profile, and the drawing opened
 * from one, which the map shows.
 */
export type DrawingsDoor = {
  /** The keys of the account's public runs; empty until the API says. */
  publicKeys: ReadonlySet<string>;
  /** Asks the API which runs are public: «My activities» does when it shows. */
  refreshMine: () => void;
  /** What the owner chose for the run `key`; null with nobody signed in. */
  choiceOf: (key: string) => Promise<ChoiceShown | null>;
  /** Makes `choice` the run's, now or when there is a network; null with
   * nobody signed in. */
  choose: (key: string, choice: DrawingChoice) => Promise<Chosen | null>;
  /** A page of the public drawings of a profile; null with nobody signed in. */
  pageOf: (
    publicId: string,
    cursor: string | null,
  ) => Promise<AccountOutcome<DrawingsPage> | null>;
  /** The drawing being fetched whole, by id; null when none. */
  opening: string | null;
  /** Why the last drawing asked for did not open; null when it did. */
  openProblem: string | null;
  /** Fetches the drawing whole and shows it on the map. */
  open: (drawing: Drawing) => void;
  /** The drawing on the map; null when none. */
  opened: DrawingDetail | null;
  /** From the map back to «Profile», where it was opened. */
  back: () => void;
};

const NO_KEYS: ReadonlySet<string> = new Set();

const NOTHING: DrawingsDoor = {
  publicKeys: NO_KEYS,
  refreshMine: () => {},
  choiceOf: async () => null,
  choose: async () => null,
  pageOf: async () => null,
  opening: null,
  openProblem: null,
  open: () => {},
  opened: null,
  back: () => {},
};

/** Without «Profile» around it (a test of one screen): no drawings. */
export const DrawingsContext = createContext<DrawingsDoor>(NOTHING);

export function useDrawingsDoor(): DrawingsDoor {
  return useContext(DrawingsContext);
}

type Doors = {
  /** A drawing is on the map: «Profile» gets out of its way. */
  onOpened: () => void;
  /** Back from the map: «Profile» again, as it was. */
  onBack: () => void;
};

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** The public keys of one account: another token's are nobody's. */
type Held = { token: string; keys: ReadonlySet<string> };

/** The drawings of the account, for «Profile» to hand to the app. */
export function useDrawingsOf(
  baseUrl: string | null,
  account: Account,
  { onOpened, onBack }: Doors,
  options: Options = {},
): DrawingsDoor {
  const { state, sessionEnded: endSession } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const owner = state.status === "signedIn" ? state.session.user.id : null;
  const { fetchFn, key } = options;
  const [held, setHeld] = useState<Held | null>(null);

  /** Ends the session the API says is over; true when it did. */
  const ended = useCallback(
    (asking: string, outcome: AccountOutcome<unknown>) => {
      if (sessionEnded(outcome)) {
        endSession(asking);
        return true;
      }
      return false;
    },
    [endSession],
  );

  const refreshMine = useCallback(() => {
    if (token === null || baseUrl === null) {
      return;
    }
    void fetchMyDrawings(baseUrl, token, { fetchFn, key }).then((outcome) => {
      if (outcome.kind === "ok") {
        setHeld({
          token,
          keys: new Set(outcome.value.filter((d) => d.public).map((d) => d.key)),
        });
      } else {
        ended(token, outcome);
      }
    });
  }, [baseUrl, ended, fetchFn, key, token]);

  /** The run `key` is public, or not, as chosen. */
  const mark = useCallback((of: string, runKey: string, on: boolean) => {
    setHeld((was) => {
      const keys = new Set(was !== null && was.token === of ? was.keys : NO_KEYS);
      if (on) {
        keys.add(runKey);
      } else {
        keys.delete(runKey);
      }
      return { token: of, keys };
    });
  }, []);

  const choiceOf = useCallback(
    async (runKey: string): Promise<ChoiceShown | null> => {
      if (token === null || owner === null || baseUrl === null) {
        return null;
      }
      // What this phone chose and could not send yet is the choice.
      const waiting = waitingDrawing(owner, runKey);
      if (waiting !== null) {
        return {
          kind: "known",
          choice: { title: waiting.title, public: waiting.public },
          waiting: true,
        };
      }
      const outcome = await fetchMyDrawing(baseUrl, token, runKey, { fetchFn, key });
      if (outcome.kind === "ok") {
        const { title, public: on } = outcome.value;
        return { kind: "known", choice: { title, public: on }, waiting: false };
      }
      if (ended(token, outcome)) {
        return { kind: "failed", problem: drawingProblem(outcome) ?? "" };
      }
      // An API from before drawings, or a run deleted from another phone.
      if (outcome.kind === "api_error" && outcome.code === "http_error") {
        return { kind: "off" };
      }
      return { kind: "failed", problem: drawingProblem(outcome) ?? "" };
    },
    [baseUrl, ended, fetchFn, key, owner, token],
  );

  const choose = useCallback(
    async (runKey: string, choice: DrawingChoice): Promise<Chosen | null> => {
      if (token === null || owner === null || baseUrl === null) {
        return null;
      }
      const outcome = await saveDrawing(baseUrl, token, runKey, choice, {
        fetchFn,
        key,
      });
      if (outcome.kind === "ok") {
        // The API has this choice: an older one still waiting on the phone
        // would undo it when it is sent (TASK-252).
        forgetForDrawing(owner, runKey);
        mark(token, runKey, outcome.value.public);
        return { kind: "saved", drawing: outcome.value };
      }
      if (ended(token, outcome)) {
        return { kind: "failed", problem: drawingProblem(outcome) ?? "" };
      }
      if (worthAgain(outcome)) {
        if (keepForDrawing({ owner, key: runKey, ...choice })) {
          mark(token, runKey, choice.public);
          return { kind: "waiting" };
        }
      } else {
        // Refused, and told so: the older choice does not go behind it.
        forgetForDrawing(owner, runKey);
      }
      return { kind: "failed", problem: drawingProblem(outcome) ?? "" };
    },
    [baseUrl, ended, fetchFn, key, mark, owner, token],
  );

  const pageOf = useCallback(
    async (publicId: string, cursor: string | null) => {
      if (token === null || baseUrl === null) {
        return null;
      }
      const outcome = await fetchUserDrawings(baseUrl, token, publicId, cursor, {
        fetchFn,
        key,
      });
      ended(token, outcome);
      return outcome;
    },
    [baseUrl, ended, fetchFn, key, token],
  );

  const [opening, setOpening] = useState<string | null>(null);
  // With the token it was opened with: nobody else's drawing on the map.
  const [opened, setOpened] = useState<{
    token: string;
    drawing: DrawingDetail;
  } | null>(null);
  const [openProblem, setOpenProblem] = useState<string | null>(null);
  // The last drawing asked for wins.
  const asked = useRef<string | null>(null);
  const open = useCallback(
    (drawing: Drawing) => {
      if (token === null || baseUrl === null) {
        return;
      }
      asked.current = drawing.id;
      setOpening(drawing.id);
      setOpenProblem(null);
      void fetchDrawing(baseUrl, token, drawing.id, { fetchFn, key }).then(
        (outcome) => {
          if (asked.current !== drawing.id) {
            return;
          }
          asked.current = null;
          setOpening(null);
          if (outcome.kind === "ok") {
            setOpened({ token, drawing: outcome.value });
            onOpened();
            return;
          }
          ended(token, outcome);
          setOpenProblem(
            // Made private, or deleted, since the page came.
            outcome.kind === "api_error" && outcome.code === "http_error"
              ? t("This drawing is no longer public.")
              : (drawingProblem(outcome) ?? ""),
          );
        },
      );
    },
    [baseUrl, ended, fetchFn, key, onOpened, token],
  );
  const back = useCallback(() => {
    asked.current = null;
    setOpening(null);
    setOpened(null);
    onBack();
  }, [onBack]);

  const publicKeys = held !== null && held.token === token ? held.keys : NO_KEYS;
  return useMemo(
    () => ({
      publicKeys,
      refreshMine,
      choiceOf,
      choose,
      pageOf,
      opening: token === null ? null : opening,
      openProblem,
      open,
      opened: opened !== null && opened.token === token ? opened.drawing : null,
      back,
    }),
    [
      publicKeys,
      refreshMine,
      choiceOf,
      choose,
      pageOf,
      opening,
      openProblem,
      open,
      token,
      opened,
      back,
    ],
  );
}
