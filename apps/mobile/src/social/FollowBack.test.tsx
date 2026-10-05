import people from "@shaperoute/shared-types/fixtures/people.json";
import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FollowState, PeoplePage, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { FollowLists } from "./FollowLists";
import { FollowsContext } from "./followsDoor";

// A request accepted stays in its row, with the way to follow in turn
// (TASK-239): «Accept», then «Follow back», one tap apart.

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const [, adam] = people.people;
const ACCEPT = `POST /me/follow-requests/${adam.public_id}/accept`;
const PROFILE = `GET /users/${adam.public_id}`;
const FOLLOW = `POST /users/${adam.public_id}/follow`;

function page(...of: (typeof adam)[]): PeoplePage {
  return { people: of, next: null, total: of.length };
}

/** Adam's profile, as the account stands towards him. */
function stands(follow: FollowState) {
  return () =>
    Response.json({
      ...publicProfile,
      public_id: adam.public_id,
      username: adam.username,
      photo: null,
      follow,
    });
}

const done = () => new Response(null, { status: 204 });

/** A fake API by method and path, with Adam asking; what it was asked, in order. */
function api(answers: Record<string, () => Response>, following = page()) {
  const all: Record<string, () => Response> = {
    "GET /me/follow-requests": () => Response.json(page(adam)),
    "GET /me/followers": () => Response.json(page()),
    "GET /me/following": () => Response.json(following),
    [ACCEPT]: done,
    ...answers,
  };
  const asked: string[] = [];
  const fetchFn = jest.fn(async (input: string, init?: RequestInit) => {
    const call = `${init?.method ?? "GET"} ${input.replace(URL, "")}`;
    asked.push(call);
    const answer = all[call];
    if (answer === undefined) {
      throw new Error(`Not in this test: ${call}`);
    }
    return answer();
  });
  return { fetchFn: fetchFn as unknown as jest.Mock, asked };
}

async function show(fetchFn: jest.Mock, requests?: number) {
  const onRequests = jest.fn();
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
        requests,
        onRequests,
      }}
    >
      <FollowLists fetchFn={fetchFn} apiKey={null} />
    </FollowsContext.Provider>,
  );
  return { onRequests };
}

async function accept() {
  await fireEvent.press(await screen.findByRole("button", { name: "Requests, 1" }));
  await fireEvent.press(screen.getByRole("button", { name: "Accept adam.trento" }));
}

test("accepted, the row offers «Follow back», and it asks to follow", async () => {
  const { fetchFn, asked } = api({
    [PROFILE]: stands("none"),
    [FOLLOW]: () => Response.json({ follow: "requested" }),
  });
  await show(fetchFn);
  await accept();
  await fireEvent.press(
    await screen.findByRole("button", { name: "Follow adam.trento back" }),
  );
  expect(await screen.findByTestId("accepted-stands")).toHaveTextContent("Requested");
  expect(screen.queryByRole("button", { name: "Follow adam.trento back" })).toBeNull();
  // Still in his row, under «Requests», which counts him no more.
  expect(screen.getByRole("button", { name: "Requests, 0" })).toBeOnTheScreen();
  expect(screen.getByText("adam.trento")).toBeOnTheScreen();
  expect(asked.slice(-3)).toEqual([ACCEPT, PROFILE, FOLLOW]);
});

test("someone followed already has no «Follow back»: the row says so", async () => {
  const { fetchFn } = api({ [PROFILE]: stands("following") });
  await show(fetchFn);
  await accept();
  expect(await screen.findByTestId("accepted-stands")).toHaveTextContent("Following");
  expect(screen.queryByRole("button", { name: "Follow adam.trento back" })).toBeNull();
});

test("a request of the account still waiting shows «Requested»", async () => {
  const { fetchFn } = api({ [PROFILE]: stands("requested") });
  await show(fetchFn);
  await accept();
  expect(await screen.findByTestId("accepted-stands")).toHaveTextContent("Requested");
  expect(screen.queryByRole("button", { name: "Follow adam.trento back" })).toBeNull();
});

test("without the profile «Follow back» is there all the same", async () => {
  // No answer to GET /users/…: asking to follow twice changes nothing.
  const { fetchFn } = api({ [FOLLOW]: () => Response.json({ follow: "following" }) });
  await show(fetchFn);
  await accept();
  await fireEvent.press(
    await screen.findByRole("button", { name: "Follow adam.trento back" }),
  );
  // Accepted before: followed at once, and counted.
  expect(await screen.findByRole("button", { name: "Following, 1" })).toBeOnTheScreen();
});

test("«Follow back» that did not go says why, and stays", async () => {
  const { fetchFn } = api({ [PROFILE]: stands("none") });
  await show(fetchFn);
  await accept();
  await fireEvent.press(
    await screen.findByRole("button", { name: "Follow adam.trento back" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(/Cannot reach the API/);
  expect(screen.getByRole("button", { name: "Follow adam.trento back" })).toBeEnabled();
});

test("with someone waiting «Requests» is open from the start, and its number is told", async () => {
  const { fetchFn } = api({ [PROFILE]: stands("none") });
  const { onRequests } = await show(fetchFn, 1);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Accept adam.trento" }),
  );
  await waitFor(() => expect(onRequests).toHaveBeenLastCalledWith(0));
  expect(onRequests).toHaveBeenNthCalledWith(1, 1);
});

test("with nobody waiting no list is open", async () => {
  const { fetchFn } = api({});
  await show(fetchFn, 0);
  expect(await screen.findByRole("button", { name: "Requests, 1" })).toBeOnTheScreen();
  expect(screen.queryByText("adam.trento")).toBeNull();
});
