import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { AccountState } from "../account/useAccount";
import { FollowsContext } from "../social/followsDoor";

/** For the tests of the groups: the signed-in member of the examples. */
export const ME = (session as Session).user.public_id!;

type Answer = { status: number; body?: unknown };
export type Call = { path: string; method: string };

/** A fake API: each `METHOD /path` as `answers` say, else 204 (404 for a
 * GET); every call kept. */
export function fakeApi(answers: Record<string, Answer | Answer[]>) {
  const calls: Call[] = [];
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = url.replace("http://api", "");
    calls.push({ path, method });
    const kept = answers[`${method} ${path}`];
    const answer: Answer = Array.isArray(kept)
      ? ((kept.length > 1 ? kept.shift() : kept[0]) ?? { status: 204 })
      : (kept ?? (method === "GET" ? { status: 404 } : { status: 204 }));
    return answer.status === 204
      ? new Response(null, { status: 204 })
      : Response.json(answer.body ?? {}, { status: answer.status });
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, calls };
}

/** `children` signed in, on a phone without insets. */
export function SignedIn({ children }: { children: ReactNode }) {
  const state: AccountState = { status: "signedIn", session: session as Session };
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <FollowsContext.Provider
        value={{
          apiUrl: "http://api",
          account: { state, sessionEnded: () => {} },
          openProfile: () => {},
        }}
      >
        {children}
      </FollowsContext.Provider>
    </SafeAreaProvider>
  );
}
