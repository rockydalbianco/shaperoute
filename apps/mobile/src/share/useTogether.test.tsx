/**
 * The post's «Together» (TASK-417 part D2b): asked once for a post of the
 * Feed, with the token; nothing for a run that is not one, nor from an API
 * of before; «alone» when nobody ran with the author.
 */
import together from "@shaperoute/shared-types/fixtures/together.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { AccountState } from "../account/useAccount";
import { FollowsContext } from "../social/followsDoor";
import { useTogether } from "./useTogether";

const state: AccountState = { status: "signedIn", session: session as Session };

function wrapper({ children }: { children: ReactNode }) {
  return (
    <FollowsContext.Provider
      value={{
        apiUrl: "http://api",
        account: { state, sessionEnded: () => {} },
        openProfile: () => {},
      }}
    >
      {children}
    </FollowsContext.Provider>
  );
}

function answering(status: number, body: unknown) {
  return jest.fn(async () => Response.json(body, { status }));
}

test("a post of the Feed with company: ready, with the page", async () => {
  const fetchFn = answering(200, together);
  const { result } = await renderHook(
    () => useTogether("d1", { fetchFn: fetchFn as unknown as typeof fetch, key: null }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.state.kind).toBe("ready"));
  expect(result.current.page).toEqual(together);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(String((fetchFn.mock.calls[0] as unknown[])[0])).toBe(
    "http://api/drawings/d1/together",
  );
});

test("nobody ran with the author: alone", async () => {
  const fetchFn = answering(200, { people: [together.people[0]] });
  const { result } = await renderHook(
    () => useTogether("d1", { fetchFn: fetchFn as unknown as typeof fetch, key: null }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.state.kind).toBe("alone"));
  expect(result.current.page).toBeNull();
});

test("not a post, or an API of before: nothing", async () => {
  const fetchFn = answering(404, {
    error: {
      code: "http_error",
      message: "Not Found",
      suggested_distance_m: null,
      reason: null,
    },
  });
  const none = await renderHook(
    () => useTogether(null, { fetchFn: fetchFn as unknown as typeof fetch, key: null }),
    { wrapper },
  );
  expect(none.result.current.state.kind).toBe("none");
  expect(fetchFn).not.toHaveBeenCalled();
  const before = await renderHook(
    () => useTogether("d1", { fetchFn: fetchFn as unknown as typeof fetch, key: null }),
    { wrapper },
  );
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
  expect(before.result.current.state.kind).toBe("none");
});
