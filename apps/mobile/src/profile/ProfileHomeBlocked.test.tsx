import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session, User } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { forgetBlocked, markBlocked } from "../social/blockedNow";
import { FollowsContext } from "../social/followsDoor";
import { ProfileHome } from "./ProfileHome";

// After a block the lists of who follows are read again (TASK-121). The row
// of «Blocked people» is in «Settings» since TASK-457, not on this page.

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const EMPTY = { people: [], next: null, total: 0 };

const realFetch = global.fetch;

beforeEach(forgetBlocked);
afterEach(() => {
  global.fetch = realFetch;
});

test("no «Blocked people» row here, and a block reads the follow lists again", async () => {
  const fetchFn = jest.fn(async (_url: string) => Response.json(EMPTY));
  global.fetch = fetchFn as unknown as typeof fetch;
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <ProfileHome
        user={session.user as User}
        favorites={2}
        activities={5}
        onOpen={jest.fn()}
        onEdit={jest.fn()}
      />
    </FollowsContext.Provider>,
  );
  expect(screen.queryByRole("button", { name: "Blocked people" })).toBeNull();
  const lists = () =>
    fetchFn.mock.calls.filter(([url]) => String(url).includes("/me/follow")).length;
  await act(async () => {});
  const before = lists();
  expect(before).toBeGreaterThan(0);
  await act(async () => markBlocked("3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44"));
  expect(lists()).toBe(2 * before);
});
