import { useEffect } from "react";

import { useDrawingsDoor } from "../social/drawingsDoor";
import { dropPending, loadPending, onSkiDayChange, PENDING_MS } from "./skiDayStore";

/** How often the days waiting for the API are tried again. */
export const RETRY_MS = 60_000;

/**
 * Sends the choices of the days of skiing saved (TASK-406 part D2): each
 * with PUT /me/activities/{key}/ski once the day itself is on the API. A day
 * still on its way answers 404, as does one without a connection: tried again
 * every RETRY_MS, and let go after PENDING_MS. Sent, or refused for good, it
 * leaves the phone. Nothing of activitiesDoor changes: the day goes as before.
 */
export function useSkiDayOutbox(now: () => number = Date.now): void {
  const { keepSkiDay } = useDrawingsDoor();
  useEffect(() => {
    if (keepSkiDay === undefined) {
      return;
    }
    let gone = false;
    let sending = false;
    let again = false;
    // Its own drops are not news: only a day queued anew asks for a send.
    let dropping = false;
    const drop = (key: string) => {
      dropping = true;
      dropPending(key);
      dropping = false;
    };
    const send = async () => {
      if (sending) {
        again = true;
        return;
      }
      sending = true;
      try {
        do {
          again = false;
          for (const day of loadPending()) {
            if (gone) {
              return;
            }
            if (now() - day.at > PENDING_MS) {
              drop(day.key);
              continue;
            }
            const result = await keepSkiDay(day.key, day.request);
            if (!gone && result !== "later") {
              drop(day.key);
            }
          }
        } while (again && !gone);
      } finally {
        sending = false;
      }
    };
    void send();
    // The gear written letter by letter changes the file too: only a day
    // not seen before asks for a send.
    let seen = new Set(loadPending().map((day) => day.key));
    const stop = onSkiDayChange(() => {
      if (dropping) {
        return;
      }
      const keys = loadPending().map((day) => day.key);
      const queued = keys.some((key) => !seen.has(key));
      seen = new Set(keys);
      if (queued) {
        void send();
      }
    });
    const timer = setInterval(() => {
      if (loadPending().length > 0) {
        void send();
      }
    }, RETRY_MS);
    return () => {
      gone = true;
      stop();
      clearInterval(timer);
    };
  }, [keepSkiDay, now]);
}
