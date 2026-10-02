import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { accountProblem, NO_API, sessionEnded } from "../account/messages";
import type { Account } from "../account/useAccount";
import type { AccountOutcome } from "../api/accounts";
import { fetchPhoto, photoUri, removePhoto, savePhoto } from "../api/profilePhoto";
import type { ImageSource } from "../route/pickImage";
import { type PickedPhoto, pickPhoto } from "./pickPhoto";

/** What is on its way: the phone's picker is open, or the API is asked. */
export type PhotoBusy = "picking" | "saving" | "removing" | null;

/**
 * The profile picture of who is signed in (TASK-178), as the whole app
 * reaches it: the button in the header, the circle in «Profile» and the
 * row of «Settings» that changes it.
 */
export type ProfilePhotoState = {
  /** The picture, as an `Image` shows it; null without one: the initial. */
  uri: string | null;
  busy: PhotoBusy;
  /** The last change that failed, in words; null once another starts. */
  problem: string | null;
  /** Opens the library or the camera, and saves the picture chosen. */
  choose: (source: ImageSource) => void;
  remove: () => void;
  clearProblem: () => void;
};

const NOTHING: ProfilePhotoState = {
  uri: null,
  busy: null,
  problem: null,
  choose: () => {},
  remove: () => {},
  clearProblem: () => {},
};

/** Without «Profile» around it (a test of one screen): no picture. */
export const ProfilePhotoContext = createContext<ProfilePhotoState>(NOTHING);

export function useProfilePhoto(): ProfilePhotoState {
  return useContext(ProfilePhotoContext);
}

type Failed = Exclude<AccountOutcome<unknown>, { kind: "ok" }>;

/** A picture that could not be picked, in words; cancelled says nothing. */
const PICK_PROBLEMS: Record<Exclude<PickedPhoto["kind"], "picked">, string | null> = {
  cancelled: null,
  denied:
    "The camera is off for this app. Allow it in Settings, or choose a picture instead.",
  too_large: "This picture is too large. Choose a smaller one.",
  pick_failed: "Could not open the picture. Try again.",
};

/** A change of the picture that failed, in words (docs/UI.md, «Settings»). */
export function photoProblem(failed: Failed): string {
  if (failed.kind === "api_error") {
    // The API's own words are for a programmer: «image: cannot read…».
    if (failed.code === "invalid_request") {
      return "This picture cannot be used. Choose another one.";
    }
    // An API from before the pictures has no such endpoint.
    if (failed.code === "http_error") {
      return "Profile pictures are not available on this API yet.";
    }
  }
  return accountProblem(failed);
}

/** The picture of one account: another token's is nobody's. */
type Held = {
  token: string;
  uri: string | null;
  busy: PhotoBusy;
  problem: string | null;
};

type Options = {
  fetchFn?: typeof fetch;
  key?: string | null;
  /** The phone's picker; the tests give their own. */
  pick?: (source: ImageSource) => Promise<PickedPhoto>;
};

/** The picture of the account, for «Profile» to hand to the app. */
export function useProfilePhotoOf(
  baseUrl: string | null,
  account: Account,
  options: Options = {},
): ProfilePhotoState {
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [held, setHeld] = useState<Held | null>(null);
  // Read by the answers that arrive later: the picture they changed may
  // have moved on. Every change goes through `change`, which keeps it.
  const current = useRef<Held | null>(null);
  // Whose answers still count: another account's are dropped.
  const tokenNow = useRef<string | null>(null);
  // The fake fetch and picker of the tests; the same for the app's life.
  const { fetchFn, key, pick = pickPhoto } = options;

  /** What the picture of `asked` becomes; nothing for a token signed out since. */
  const change = useCallback((asked: string, next: (was: Held) => Partial<Held>) => {
    if (tokenNow.current !== asked) {
      return;
    }
    const was =
      current.current !== null && current.current.token === asked
        ? current.current
        : { token: asked, uri: null, busy: null, problem: null };
    const held = { ...was, ...next(was) };
    current.current = held;
    setHeld(held);
  }, []);

  /** The picture of `asked` as it is now; null before anything is known. */
  const now = useCallback((asked: string): Held | null => {
    const held = current.current;
    return held !== null && held.token === asked ? held : null;
  }, []);

  const failed = useCallback(
    (asked: string, outcome: Failed) => {
      change(asked, () => ({ busy: null, problem: photoProblem(outcome) }));
      if (sessionEnded(outcome)) {
        onSessionEnded(asked);
      }
    },
    [change, onSessionEnded],
  );

  // A new account, or the same when the app opens: its picture. Without an
  // answer the initial stays: a picture is never worth an error on screen.
  useEffect(() => {
    tokenNow.current = token;
    if (token === null || baseUrl === null) {
      return;
    }
    void fetchPhoto(baseUrl, token, { fetchFn, key }).then((outcome) => {
      if (outcome.kind === "ok") {
        const uri = outcome.value === null ? null : photoUri(outcome.value);
        // A picture changed in the meantime is newer than this answer.
        change(token, (was) => (was.busy === null && was.uri === null ? { uri } : {}));
      } else if (sessionEnded(outcome)) {
        onSessionEnded(token);
      }
    });
  }, [baseUrl, change, fetchFn, key, onSessionEnded, token]);

  const choose = useCallback(
    async (source: ImageSource) => {
      if (token === null || (now(token)?.busy ?? null) !== null) {
        return;
      }
      if (baseUrl === null) {
        change(token, () => ({ problem: NO_API }));
        return;
      }
      // From the tap: while the picker is open a second tap opens no other.
      change(token, () => ({ busy: "picking", problem: null }));
      const picked = await pick(source);
      if (picked.kind !== "picked") {
        change(token, () => ({ busy: null, problem: PICK_PROBLEMS[picked.kind] }));
        return;
      }
      change(token, () => ({ busy: "saving" }));
      const outcome = await savePhoto(baseUrl, token, picked.base64, { fetchFn, key });
      if (outcome.kind === "ok") {
        // As the API kept it: the square everyone will see.
        change(token, () => ({ uri: photoUri(outcome.value), busy: null }));
      } else {
        failed(token, outcome);
      }
    },
    [baseUrl, change, failed, fetchFn, key, now, pick, token],
  );

  // Only with the API's yes: a picture the phone hid but the API kept would
  // come back at the next opening.
  const remove = useCallback(async () => {
    const mine = token === null ? null : now(token);
    if (token === null || mine === null || mine.busy !== null || mine.uri === null) {
      return;
    }
    if (baseUrl === null) {
      change(token, () => ({ problem: NO_API }));
      return;
    }
    change(token, () => ({ busy: "removing", problem: null }));
    const outcome = await removePhoto(baseUrl, token, { fetchFn, key });
    if (outcome.kind === "ok") {
      change(token, () => ({ uri: null, busy: null }));
    } else {
      failed(token, outcome);
    }
  }, [baseUrl, change, failed, fetchFn, key, now, token]);

  const clearProblem = useCallback(() => {
    if (token !== null) {
      change(token, () => ({ problem: null }));
    }
  }, [change, token]);

  const mine = held !== null && held.token === token ? held : null;
  const uri = mine?.uri ?? null;
  const busy = mine?.busy ?? null;
  const problem = mine?.problem ?? null;
  return useMemo(
    () => ({
      uri,
      busy,
      problem,
      choose: (source: ImageSource) => void choose(source),
      remove: () => void remove(),
      clearProblem,
    }),
    [uri, busy, problem, choose, remove, clearProblem],
  );
}
