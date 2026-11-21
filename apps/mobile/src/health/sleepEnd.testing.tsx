import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import sleepKept from "@shaperoute/shared-types/fixtures/sleep-activity.json";
import type { ReactNode } from "react";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import type { SleepSample } from "./sleepNight";
import type { SleepReader } from "./sleepSamples";

/**
 * What the tests of «Sleep last night» at the end of a workout at the gym
 * and of a swim in a pool share (TASK-467 part B2b): somebody signed in, a
 * fake API that keeps what was asked, a fake reader of the sleep, and the
 * screen without the block of the sleep, to tell that nothing else moved.
 */

export const SIGNED_IN = session as Session;
export const OWNER = SIGNED_IN.user.id;
const URL = "http://api";

/** Somebody signed in, around what is shown. */
export function SignedIn({ children }: { children: ReactNode }) {
  const follows = {
    apiUrl: URL,
    account: {
      state: { status: "signedIn", session: SIGNED_IN },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
  const activities = {
    signedIn: true,
    owner: OWNER,
    refresh: () => {},
    signIn: () => {},
  } as unknown as ActivitiesDoor;
  return (
    <FollowsContext.Provider value={follows}>
      <ActivitiesContext.Provider value={activities}>
        {children}
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>
  );
}

/** A reader the phone does not have yet: with health data, never asked. */
export function fakeSleepReader(changes: Partial<SleepReader> = {}): SleepReader {
  return {
    store: "apple",
    available: async () => true,
    ask: jest.fn(async () => {}),
    samples: jest.fn(async (): Promise<SleepSample[]> => []),
    ...changes,
  };
}

/**
 * A fetch that answers the session (the workout, the swim) with `kept`, a
 * night with the example, anything else with a yes; `away` true, the API
 * cannot be reached. `sent()` is what was asked that is not a GET, in
 * order: "PUT /me/…".
 */
export function fakeApi(kept: unknown, sessions: RegExp, away = false) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace(URL, "");
    const method = init?.method ?? "GET";
    calls.push({
      method,
      path,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    if (away) {
      throw new Error("offline");
    }
    if (path.endsWith("/sleep")) {
      return Response.json(sleepKept);
    }
    return Response.json(sessions.test(path) ? kept : {});
  }) as jest.Mock & typeof fetch;
  const sent = () =>
    calls
      .filter((call) => call.method !== "GET")
      .map((call) => `${call.method} ${call.path}`);
  return { fetchFn, calls, sent };
}

/** A node of the screen as the test renderer gives it, or a word. */
type Drawn =
  { type: string; props: Record<string, unknown>; children: Drawn[] | null } | string;

/** The screen as it is drawn (`screen.toJSON()`), without the node `testID`
 * and what is in it. */
export function without(tree: unknown, testID: string): Drawn[] {
  const strip = (node: Drawn): Drawn[] => {
    if (typeof node === "string") {
      return [node];
    }
    if (node.props.testID === testID) {
      return [];
    }
    return [{ ...node, children: node.children?.flatMap(strip) ?? null }];
  };
  if (tree === null || tree === undefined) {
    return [];
  }
  return (Array.isArray(tree) ? (tree as Drawn[]) : [tree as Drawn]).flatMap(strip);
}
