import {
  type LatLon,
  LIVE_VIEW_EVERY_S,
  type LiveStats,
  type LiveStatus,
} from "@shaperoute/shared-types";
import { useEffect, useState } from "react";

import { fetchLiveView, type LiveApiOptions } from "./liveShareApi";

/**
 * A live share as a signed-in viewer follows it in the app (TASK-468 part
 * B1, ADR-0381): GET /live-shares/{id} every LIVE_VIEW_EVERY_S, as the web
 * page does, only the points after the last ones; a long track comes in
 * pages, asked at once. Stops asking once it is over.
 */

export type LiveViewState = {
  /** Null before the first answer. "gone" when the viewer may not see it
   * any more, or it never was: «Live ended». */
  status: LiveStatus | "gone" | null;
  activity: string | null;
  points: LatLon[];
  stats: LiveStats | null;
  startedAt: string | null;
  updatedAt: string | null;
  finishedAt: string | null;
};

export const EMPTY_VIEW: LiveViewState = {
  status: null,
  activity: null,
  points: [],
  stats: null,
  startedAt: null,
  updatedAt: null,
  finishedAt: null,
};

/** Over: nothing more will come. */
export function isOver(status: LiveViewState["status"]): boolean {
  return status === "stopped" || status === "expired" || status === "gone";
}

/** One round: the answers after `after`, the pages that follow at once. */
export async function nextView(
  api: LiveApiOptions,
  id: string,
  before: LiveViewState,
  after: number,
): Promise<{ view: LiveViewState; after: number }> {
  let view = before;
  let seq = after;
  for (;;) {
    const answer = await fetchLiveView(api, id, seq);
    if (answer.kind === "ended") {
      return { view: { ...view, status: "gone" }, after: seq };
    }
    if (answer.kind !== "ok") {
      // No network or a 5xx: the same at the next round.
      return { view, after: seq };
    }
    const body = answer.value;
    view = {
      status: body.status,
      activity: body.activity ?? view.activity,
      points: [...view.points, ...body.points.map(([lat, lon]): LatLon => [lat, lon])],
      stats: body.stats ?? (isOver(body.status) ? null : view.stats),
      startedAt: body.started_at ?? view.startedAt,
      updatedAt: body.updated_at ?? view.updatedAt,
      finishedAt: body.finished_at ?? view.finishedAt,
    };
    seq = body.last_seq;
    if (!body.more) {
      return { view, after: seq };
    }
  }
}

/** The share `id` as it goes, asked again every LIVE_VIEW_EVERY_S. `api`
 * the same object between renders (useMemo), or the rounds start again. */
export function useLiveView(api: LiveApiOptions | null, id: string): LiveViewState {
  const [view, setView] = useState<LiveViewState>(EMPTY_VIEW);

  useEffect(() => {
    if (api === null) {
      return;
    }
    let live = true;
    let after = 0;
    let shown = EMPTY_VIEW;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const round = async () => {
      const next = await nextView(api, id, shown, after);
      if (!live) {
        return;
      }
      shown = next.view;
      after = next.after;
      setView(shown);
      if (!isOver(shown.status)) {
        timer = setTimeout(() => void round(), LIVE_VIEW_EVERY_S * 1000);
      }
    };
    void round();
    return () => {
      live = false;
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [api, id]);

  return view;
}
