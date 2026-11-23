import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { authHeaders } from "../api/accounts";
import { apiKey as defaultKey, keyHeaders } from "../api/apiUrl";
import { LiveViewScreen } from "./LiveViewScreen";

/**
 * Who opens the live view from outside the Feed and the chat (TASK-468 part
 * B2b1): a push «… is live» touched. `openLiveView` says which; `LiveViewHost`,
 * mounted once by «Profile» where the pushes are opened, shows it, with the
 * name of whose it is read from the planned live.
 */

type Watching = { shareId: string; plannedLiveId: string | null };

let watching: Watching | null = null;
const listeners = new Set<() => void>();

function put(next: Watching | null): void {
  watching = next;
  for (const listener of listeners) {
    listener();
  }
}

export function openLiveView(
  shareId: string,
  plannedLiveId: string | null = null,
): void {
  put({ shareId, plannedLiveId });
}

export function closeLiveView(): void {
  put(null);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** For the tests: as when the app opens. */
export function resetLiveViewDoor(): void {
  watching = null;
  listeners.clear();
}

/** GET /planned-lives/{id}: whose live it is, for the title; "" without. */
async function ownerName(
  baseUrl: string,
  token: string,
  plannedLiveId: string,
  fetchFn: typeof fetch,
  key: string | null,
): Promise<string> {
  try {
    const answer = await fetchFn(
      `${baseUrl}/planned-lives/${encodeURIComponent(plannedLiveId)}`,
      { headers: { ...keyHeaders(key), ...authHeaders(token) } },
    );
    if (!answer.ok) {
      return "";
    }
    const body: unknown = await answer.json();
    const owner = (body as { owner?: { username?: unknown } }).owner;
    return typeof owner?.username === "string" ? owner.username : "";
  } catch {
    return "";
  }
}

export function LiveViewHost({
  apiUrl,
  token,
  fetchFn = fetch,
  apiKey = defaultKey(),
}: {
  apiUrl: string | null;
  token: string | null;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
}) {
  const shown = useSyncExternalStore(subscribe, () => watching);
  // The name read for a planned live: shown only for that one.
  const [found, setFound] = useState<{ planned: string; name: string } | null>(null);
  const planned = shown?.plannedLiveId ?? null;
  const name = found !== null && found.planned === planned ? found.name : "";

  useEffect(() => {
    if (planned === null || apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void ownerName(apiUrl, token, planned, fetchFn, apiKey).then((read) => {
      if (live) {
        setFound({ planned, name: read });
      }
    });
    return () => {
      live = false;
    };
  }, [planned, apiUrl, token, fetchFn, apiKey]);

  const screen = useMemo(
    () =>
      shown === null || apiUrl === null || token === null ? null : (
        <LiveViewScreen
          shareId={shown.shareId}
          name={name}
          apiUrl={apiUrl}
          token={token}
          fetchFn={fetchFn}
          apiKey={apiKey}
          onClose={closeLiveView}
        />
      ),
    [shown, name, apiUrl, token, fetchFn, apiKey],
  );
  return screen;
}
