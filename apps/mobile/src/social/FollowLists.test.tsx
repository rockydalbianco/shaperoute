import people from "@shaperoute/shared-types/fixtures/people.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { PeoplePage, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiError } from "../account/testing";
import type { AccountState } from "../account/useAccount";
import { FollowLists } from "./FollowLists";
import { FollowsContext } from "./followsDoor";

// Who follows the account, in «Profile» (TASK-211, ADR-0173): three
// numbers, the list of the one touched, and what is done in it.

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const [ada, adam] = people.people;

function page(...of: (typeof ada)[]): PeoplePage {
  return { people: of, next: null, total: of.length };
}

/** A fake API by method and path; what it was asked, in order. */
function api(answers: Record<string, () => Response>) {
  const asked: string[] = [];
  const fetchFn = jest.fn(async (input: string, init?: RequestInit) => {
    const call = `${init?.method ?? "GET"} ${input.replace(URL, "")}`;
    asked.push(call);
    const answer = answers[call];
    if (answer === undefined) {
      throw new Error(`Not in this test: ${call}`);
    }
    return answer();
  });
  return { fetchFn: fetchFn as unknown as jest.Mock, asked };
}

function lists(
  requests: PeoplePage,
  followers: PeoplePage,
  following: PeoplePage,
): Record<string, () => Response> {
  return {
    "GET /me/follow-requests": () => Response.json(requests),
    "GET /me/followers": () => Response.json(followers),
    "GET /me/following": () => Response.json(following),
  };
}

const done = () => new Response(null, { status: 204 });

async function show(
  fetchFn: jest.Mock,
  { state = signedIn }: { state?: AccountState } = {},
) {
  const openProfile = jest.fn();
  const sessionEnded = jest.fn();
  await render(
    <FollowsContext.Provider
      value={{ apiUrl: URL, account: { state, sessionEnded }, openProfile }}
    >
      <FollowLists fetchFn={fetchFn} apiKey={null} />
    </FollowsContext.Provider>,
  );
  return { openProfile, sessionEnded };
}

test("three numbers, and a mark when someone waits for an answer", async () => {
  const { fetchFn } = api(lists(page(adam), page(ada), page()));
  await show(fetchFn);
  expect(await screen.findByRole("button", { name: "Requests, 1" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Followers, 1" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Following, 0" })).toBeOnTheScreen();
  expect(screen.getByTestId("requests-waiting")).toBeOnTheScreen();
  // No list is open until a number is touched.
  expect(screen.queryByText("adam.trento")).toBeNull();
  expect(fetchFn.mock.calls[0][1]).toMatchObject({
    headers: { Authorization: `Bearer ${session.token}` },
  });
});

test("a request accepted becomes a follower", async () => {
  const { fetchFn, asked } = api({
    ...lists(page(adam), page(ada), page()),
    [`POST /me/follow-requests/${adam.public_id}/accept`]: done,
  });
  await show(fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Requests, 1" }));
  await fireEvent.press(screen.getByRole("button", { name: "Accept adam.trento" }));
  expect(await screen.findByRole("button", { name: "Requests, 0" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Followers, 2" })).toBeOnTheScreen();
  expect(screen.getByText("Nobody is asking to follow you.")).toBeOnTheScreen();
  expect(screen.queryByTestId("requests-waiting")).toBeNull();
  expect(asked).toContain(`POST /me/follow-requests/${adam.public_id}/accept`);

  await fireEvent.press(screen.getByRole("button", { name: "Followers, 2" }));
  expect(screen.getByText("adam.trento")).toBeOnTheScreen();
  expect(screen.getByText("Ada_runs")).toBeOnTheScreen();
});

test("a request declined is gone, and nobody follows more", async () => {
  const { fetchFn, asked } = api({
    ...lists(page(adam), page(), page()),
    [`POST /me/follow-requests/${adam.public_id}/decline`]: done,
  });
  await show(fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Requests, 1" }));
  await fireEvent.press(screen.getByRole("button", { name: "Decline adam.trento" }));
  expect(await screen.findByRole("button", { name: "Requests, 0" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Followers, 0" })).toBeOnTheScreen();
  expect(asked).toContain(`POST /me/follow-requests/${adam.public_id}/decline`);
});

test("«Remove» asks first, then the follower is gone", async () => {
  const { fetchFn, asked } = api({
    ...lists(page(), page(ada, adam), page()),
    [`DELETE /me/followers/${ada.public_id}`]: done,
  });
  await show(fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Followers, 2" }));
  await fireEvent.press(screen.getByRole("button", { name: "Remove Ada_runs" }));
  expect(screen.getByText("Remove Ada_runs from your followers?")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Keep it" }));
  expect(asked).toHaveLength(3);

  await fireEvent.press(screen.getByRole("button", { name: "Remove Ada_runs" }));
  await fireEvent.press(screen.getByRole("button", { name: "Remove" }));
  expect(await screen.findByRole("button", { name: "Followers, 1" })).toBeOnTheScreen();
  expect(screen.queryByText("Ada_runs")).toBeNull();
  expect(screen.getByText("adam.trento")).toBeOnTheScreen();
  expect(asked).toContain(`DELETE /me/followers/${ada.public_id}`);
});

test("a name opens the member's profile; the ones followed have no button", async () => {
  const { fetchFn } = api(lists(page(), page(), page(ada)));
  const { openProfile } = await show(fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Following, 1" }));
  expect(screen.queryByRole("button", { name: /^Remove/ })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Ada_runs" }));
  expect(openProfile).toHaveBeenCalledWith(ada);
});

test("an answer that did not go leaves the request, and says why", async () => {
  const { fetchFn } = api(lists(page(adam), page(), page()));
  await show(fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Requests, 1" }));
  await fireEvent.press(screen.getByRole("button", { name: "Accept adam.trento" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Cannot reach the API/);
  expect(screen.getByRole("button", { name: "Requests, 1" })).toBeOnTheScreen();
  expect(screen.getByText("adam.trento")).toBeOnTheScreen();
});

test("«Show more» asks the next page and adds it", async () => {
  const { fetchFn, asked } = api({
    ...lists(page(), { people: [ada], next: "then", total: 2 }, page()),
    "GET /me/followers?cursor=then": () => Response.json(page(ada, adam)),
  });
  await show(fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Followers, 2" }));
  await fireEvent.press(screen.getByRole("button", { name: "Show more" }));
  expect(await screen.findByText("adam.trento")).toBeOnTheScreen();
  // A member already shown is not shown twice.
  expect(screen.getAllByText("Ada_runs")).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
  expect(asked).toContain("GET /me/followers?cursor=then");
});

test("touched again, a number closes its list", async () => {
  const { fetchFn } = api(lists(page(), page(), page()));
  await show(fetchFn);
  const following = await screen.findByRole("button", { name: "Following, 0" });
  await fireEvent.press(following);
  expect(
    screen.getByText("You are not following anyone yet. Find friends from Feed."),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Following, 0" }));
  expect(screen.queryByText(/You are not following anyone/)).toBeNull();
});

test("an API older than following shows nothing", async () => {
  const none = () =>
    Response.json(apiError("http_error", "Not Found"), { status: 404 });
  const { fetchFn } = api({
    "GET /me/follow-requests": none,
    "GET /me/followers": none,
    "GET /me/following": none,
  });
  await show(fetchFn);
  await waitFor(() => expect(screen.queryAllByRole("button")).toHaveLength(0));
});

test("a session that ended signs out; signed out, nothing is asked", async () => {
  const ended = () => Response.json(apiError("session_expired"), { status: 401 });
  const first = api({
    "GET /me/follow-requests": ended,
    "GET /me/followers": ended,
    "GET /me/following": ended,
  });
  const { sessionEnded } = await show(first.fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Requests" }));
  expect(
    await screen.findByText("Your session has ended. Log in again."),
  ).toBeOnTheScreen();
  expect(sessionEnded).toHaveBeenCalledWith(session.token);

  const second = api({});
  await show(second.fetchFn, { state: { status: "signedOut", notice: null } });
  expect(second.fetchFn).not.toHaveBeenCalled();
});
