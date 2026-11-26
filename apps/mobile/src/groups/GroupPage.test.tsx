/**
 * The page of a group (TASK-495 part B): the top for everybody, the button
 * of who looks («Join», «Requested», «Accept invite», «Mute», «Leave
 * group»), the admin's «Edit», «Requests» and «Invite», then the sections;
 * the members and the activity only for the members; 404 as not there.
 */
import feed from "@shaperoute/shared-types/fixtures/feed.json";
import detail from "@shaperoute/shared-types/fixtures/group.json";
import members from "@shaperoute/shared-types/fixtures/group-members.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { GroupDetail, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { AccountState } from "../account/useAccount";
import { DrawingsContext, type DrawingsDoor } from "../social/drawingsDoor";
import { FollowsContext } from "../social/followsDoor";
import { GroupPage } from "./GroupPage";

// A card of «Feed» is tried in its own tests: here, its title.
jest.mock("../feed/FeedPost", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    FeedPost: ({ post, onOpen }: { post: { id: string }; onOpen: () => void }) => (
      <Text testID={`post-${post.id}`} onPress={onOpen}>
        {post.id}
      </Text>
    ),
  };
});

const ADMIN = detail as unknown as GroupDetail;
const ID = ADMIN.id;
const OUTSIDE: GroupDetail = { ...ADMIN, me: "none" };

type Answer = { status: number; body?: unknown };
type Call = { path: string; method: string };

/** A fake API: the group as `groups` say, one after the other; the other
 * addresses as `others` say, or 204. */
function api(groups: (GroupDetail | Answer)[], others: Record<string, Answer> = {}) {
  const calls: Call[] = [];
  let next = 0;
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = url.replace("http://api", "");
    calls.push({ path, method });
    const key = `${method} ${path}`;
    let answer: Answer;
    if (key === `GET /groups/${ID}`) {
      const one = groups[Math.min(next, groups.length - 1)]!;
      next += 1;
      answer = "status" in one ? one : { status: 200, body: one };
    } else {
      answer = others[key] ?? (method === "GET" ? { status: 404 } : { status: 204 });
    }
    return answer.status === 204
      ? new Response(null, { status: 204 })
      : Response.json(answer.body ?? {}, { status: answer.status });
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, calls };
}

const INSIDE: Record<string, Answer> = {
  [`GET /groups/${ID}/members?limit=20`]: { status: 200, body: members },
  [`GET /groups/${ID}/activity`]: { status: 200, body: feed },
  [`GET /groups/${ID}/requests?limit=20`]: {
    status: 200,
    body: { people: [members.members[2]], next: null, total: 2 },
  },
};

async function shown(
  fetchFn: typeof fetch,
  {
    onBack = jest.fn(),
    open = jest.fn(),
  }: { onBack?: jest.Mock; open?: jest.Mock } = {},
) {
  const state: AccountState = { status: "signedIn", session: session as Session };
  await render(
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
        <DrawingsContext.Provider value={{ open } as unknown as DrawingsDoor}>
          <GroupPage groupId={ID} onBack={onBack} fetchFn={fetchFn} apiKey={null} />
        </DrawingsContext.Provider>
      </FollowsContext.Provider>
    </SafeAreaProvider>,
  );
  return { onBack, open };
}

test("the admin sees the group, its members with roles, the activity and its buttons", async () => {
  const { fetchFn } = api([ADMIN], INSIDE);
  const { onBack, open } = await shown(fetchFn);
  expect(await screen.findByText(ADMIN.name)).toBeTruthy();
  expect(screen.getByText(ADMIN.description!)).toBeTruthy();
  expect(screen.getByText(/Trento · 3 members/)).toBeTruthy();
  expect(screen.getByTestId("group-edit")).toBeTruthy();
  expect(screen.getByTestId("group-open-invite")).toBeTruthy();
  expect(await screen.findByText("Requests (2)")).toBeTruthy();
  expect(screen.getByText("Next outings")).toBeTruthy();
  expect(screen.getByText("Past outings")).toBeTruthy();
  expect(screen.getAllByText("No outings yet.")).toHaveLength(2);
  expect(screen.getByText("ada")).toBeTruthy();
  expect(screen.getByText("Admin")).toBeTruthy();
  expect(screen.getByText("Co-admin")).toBeTruthy();
  expect(screen.getByText("All members (3)")).toBeTruthy();
  // The admin does not report their own group.
  expect(screen.queryByTestId("group-report")).toBeNull();
  const [post] = feed.posts;
  await fireEvent.press(screen.getByTestId(`post-${post!.id}`));
  expect(onBack).toHaveBeenCalled();
  expect(open).toHaveBeenCalledWith({ id: post!.id });
});

test("who is not in a group one asks to join sees only the top, and «Join» asks", async () => {
  const { fetchFn, calls } = api([OUTSIDE, { ...OUTSIDE, me: "requested" }], {
    [`PUT /groups/${ID}/membership`]: { status: 200, body: { me: "requested" } },
  });
  await shown(fetchFn);
  await fireEvent.press(await screen.findByTestId("group-join"));
  expect(screen.queryByText("Members")).toBeNull();
  expect(screen.queryByText("Recent activity")).toBeNull();
  expect(screen.queryByText("Next outings")).toBeNull();
  expect(screen.getByTestId("group-report")).toBeTruthy();
  await fireEvent.press(await screen.findByTestId("group-requested"));
  expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
    `GET /groups/${ID}`,
    `PUT /groups/${ID}/membership`,
    `GET /groups/${ID}`,
    `DELETE /groups/${ID}/membership`,
    `GET /groups/${ID}`,
  ]);
});

test("a public group shows its outings to who is not in it", async () => {
  const { fetchFn } = api([{ ...OUTSIDE, access: "public" }]);
  await shown(fetchFn);
  expect(await screen.findByText("Next outings")).toBeTruthy();
  expect(screen.queryByText("Members")).toBeNull();
});

test("an invite is accepted or declined; declined by invite only, the page goes", async () => {
  const invited: GroupDetail = { ...ADMIN, me: "invited", access: "invite" };
  const { fetchFn, calls } = api([invited]);
  const { onBack } = await shown(fetchFn);
  expect(await screen.findByTestId("group-accept")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("group-decline"));
  expect(calls[1]).toEqual({ path: `/groups/${ID}/membership`, method: "DELETE" });
  expect(onBack).toHaveBeenCalled();
});

test("a member mutes the group, and leaves it after a question", async () => {
  const member: GroupDetail = { ...ADMIN, me: "member" };
  const { fetchFn, calls } = api([member, { ...member, muted: true }], INSIDE);
  const alert = jest.spyOn(Alert, "alert");
  await shown(fetchFn);
  expect(await screen.findByText("Members")).toBeTruthy();
  expect(screen.queryByTestId("group-edit")).toBeNull();
  expect(screen.queryByTestId("group-open-invite")).toBeNull();
  await fireEvent.press(screen.getByTestId("group-mute"));
  expect(calls.some((c) => c.method === "PUT" && c.path === `/groups/${ID}/mute`)).toBe(
    true,
  );
  expect(await screen.findByText("Unmute")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("group-leave"));
  await act(async () => {
    await alert.mock.calls[0][2]![1]!.onPress!();
  });
  expect(
    calls.some((c) => c.method === "DELETE" && c.path === `/groups/${ID}/membership`),
  ).toBe(true);
  alert.mockRestore();
});

test("the admin of others is asked to pass the role first", async () => {
  const words = "Pass the admin role to another member before you leave.";
  const { fetchFn } = api([ADMIN], {
    ...INSIDE,
    [`DELETE /groups/${ID}/membership`]: {
      status: 422,
      body: {
        error: {
          code: "invalid_request",
          message: words,
          suggested_distance_m: null,
          reason: null,
        },
      },
    },
  });
  const alert = jest.spyOn(Alert, "alert");
  await shown(fetchFn);
  await fireEvent.press(await screen.findByTestId("group-leave"));
  await act(async () => {
    await alert.mock.calls[0][2]![1]!.onPress!();
  });
  expect(await screen.findByText(words)).toBeTruthy();
  alert.mockRestore();
});

test("a group nobody may see is not available", async () => {
  const { fetchFn } = api([
    {
      status: 404,
      body: {
        error: {
          code: "http_error",
          message: "No group with this id.",
          suggested_distance_m: null,
          reason: null,
        },
      },
    },
  ]);
  await shown(fetchFn);
  expect(await screen.findByText("This group isn't available.")).toBeTruthy();
});
