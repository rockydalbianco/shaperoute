import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useFollowsDoor } from "./followsDoor";
import {
  keepPhotoPost,
  keepPhotoPostDeleted,
  type PhotoPostChange,
  type PhotoPostKept,
  sendWaitingPhotoPosts,
} from "./photoPostOutbox";

/**
 * «Post» of a post of photos only, its changes and its deletion (TASK-312
 * part C2): first into the file on the phone (photoPostOutbox.ts), then to
 * the API, now or when there is a network: when somebody signs in, when the
 * app comes back to the front, after each change. One round at a time for
 * the whole app, whichever screen asked; once something reached the API
 * the screens that listen (the Feed) read it again.
 */

type Listener = () => void;
const listeners = new Set<Listener>();
let sending = false;

/** Called after a round that reached the API; returns the way to stop. */
export function onPhotoPostsSent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** What «Post» did: kept, too many, the phone refused, or nobody signed in. */
export type PhotoPostSaved = PhotoPostKept | "signed_out";

export function usePhotoPostOutbox(fetchFn?: typeof fetch): {
  /** The post, `key` made by the caller, changed as `change` says. */
  save: (change: Omit<PhotoPostChange, "owner">) => PhotoPostSaved;
  /** The post `key` deleted. */
  remove: (key: string) => PhotoPostSaved;
  /** The account the posts belong to; null signed out. */
  owner: number | null;
} {
  const { apiUrl, account } = useFollowsDoor();
  const signedIn = account.state.status === "signedIn" ? account.state.session : null;
  const token = signedIn?.token ?? null;
  const owner = signedIn?.user.id ?? null;
  const latest = useRef({ apiUrl, token, owner, fetchFn });
  // The latest of each, for a round that waits on the network.
  useEffect(() => {
    latest.current = { apiUrl, token, owner, fetchFn };
  });

  const send = useCallback(async () => {
    const { apiUrl: url, token: key, owner: who } = latest.current;
    if (sending || url === null || key === null || who === null) {
      return;
    }
    sending = true;
    let sent = false;
    try {
      ({ sent } = await sendWaitingPhotoPosts(url, key, who, {
        fetchFn: latest.current.fetchFn,
      }));
    } finally {
      sending = false;
    }
    if (sent) {
      for (const listener of [...listeners]) {
        listener();
      }
    }
  }, []);

  // Those left from before go as soon as somebody is signed in, and when
  // the app comes back to the front.
  useEffect(() => {
    void send();
  }, [send, token, owner]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void send();
      }
    });
    return () => subscription.remove();
  }, [send]);

  const save = useCallback(
    (change: Omit<PhotoPostChange, "owner">): PhotoPostSaved => {
      const who = latest.current.owner;
      if (who === null) {
        return "signed_out";
      }
      const kept = keepPhotoPost({ ...change, owner: who });
      if (kept === "kept") {
        void send();
      }
      return kept;
    },
    [send],
  );

  const remove = useCallback(
    (key: string): PhotoPostSaved => {
      const who = latest.current.owner;
      if (who === null) {
        return "signed_out";
      }
      if (!keepPhotoPostDeleted(who, key)) {
        return "not_written";
      }
      void send();
      return "kept";
    },
    [send],
  );

  return { save, remove, owner };
}
