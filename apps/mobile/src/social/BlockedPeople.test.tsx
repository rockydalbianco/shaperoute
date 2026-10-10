import people from "@shaperoute/shared-types/fixtures/people.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { PeoplePage, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { apiError } from "../account/testing";
import type { AccountState } from "../account/useAccount";
import { BlockedPeople } from "./BlockedPeople";
import { forgetBlocked, markBlocked, useBlockedNow } from "./blockedNow";
import { FollowsContext } from "./followsDoor";

// «Blocked people» in «Profile» (TASK-121, ADR-0228): the members blocked,
// read when the row opens, each with «Unblock».

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const [ada, adam] = people.people;

function page(next: string | null, ...of: (typeof ada)[]): PeoplePage {
  return { people: of, next, total: of.length };
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

/** What «Feed» reads to hide Ada's cards. */
function Probe() {
  return <Text>{useBlockedNow(ada.public_id) ? "ada hidden" : "ada shown"}</Text>;
}

async function show(fetchFn: jest.Mock, state: AccountState = signedIn) {
  const sessionEnded = jest.fn();
  await render(
    <FollowsContext.Provider
      value={{ apiUrl: URL, account: { state, sessionEnded }, openProfile: jest.fn() }}
    >
      <Probe />
      <BlockedPeople fetchFn={fetchFn} apiKey={null} />
    </FollowsContext.Provider>,
  );
  return { sessionEnded };
}

const row = () => screen.getByRole("button", { name: "Blocked people" });

beforeEach(forgetBlocked);

test("closed, the row asks nothing", async () => {
  const { fetchFn } = api({});
  await show(fetchFn);
  expect(row()).toBeOnTheScreen();
  expect(row()).toHaveProp("accessibilityState", { expanded: false });
  expect(fetchFn).not.toHaveBeenCalled();
});

test("signed out there is no row", async () => {
  const { fetchFn } = api({});
  await show(fetchFn, { status: "signedOut", notice: null });
  expect(screen.queryByRole("button", { name: "Blocked people" })).toBeNull();
});

test("opened, it lists the members blocked, with the token", async () => {
  const { fetchFn } = api({ "GET /me/blocked": () => Response.json(page(null, ada)) });
  await show(fetchFn);
  await fireEvent.press(row());
  expect(await screen.findByText("Ada_runs")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Unblock Ada_runs" })).toBeOnTheScreen();
  expect(fetchFn.mock.calls[0][1]).toMatchObject({
    headers: { Authorization: `Bearer ${session.token}` },
  });
});

test("nobody blocked says so", async () => {
  const { fetchFn } = api({ "GET /me/blocked": () => Response.json(page(null)) });
  await show(fetchFn);
  await fireEvent.press(row());
  expect(await screen.findByText("You have not blocked anyone.")).toBeOnTheScreen();
});

test("«Unblock» takes the member off the list and back into «Feed»", async () => {
  const { fetchFn, asked } = api({
    "GET /me/blocked": () => Response.json(page(null, ada, adam)),
    [`DELETE /users/${ada.public_id}/block`]: () => new Response(null, { status: 204 }),
  });
  await act(async () => markBlocked(ada.public_id));
  await show(fetchFn);
  expect(screen.getByText("ada hidden")).toBeOnTheScreen();
  await fireEvent.press(row());
  await fireEvent.press(
    await screen.findByRole("button", { name: "Unblock Ada_runs" }),
  );
  await act(async () => {});
  expect(screen.queryByText("Ada_runs")).toBeNull();
  expect(screen.getByText("adam.trento")).toBeOnTheScreen();
  expect(screen.getByText("ada shown")).toBeOnTheScreen();
  expect(asked).toEqual(["GET /me/blocked", `DELETE /users/${ada.public_id}/block`]);
});

test("«Show more» reads the next page", async () => {
  const { fetchFn, asked } = api({
    "GET /me/blocked": () => Response.json(page("1-abc", ada)),
    "GET /me/blocked?cursor=1-abc": () => Response.json(page(null, adam)),
  });
  await show(fetchFn);
  await fireEvent.press(row());
  await fireEvent.press(await screen.findByRole("button", { name: "Show more" }));
  expect(await screen.findByText("adam.trento")).toBeOnTheScreen();
  expect(screen.getByText("Ada_runs")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
  expect(asked).toEqual(["GET /me/blocked", "GET /me/blocked?cursor=1-abc"]);
});

test("a list that did not come says why; an expired session ends", async () => {
  const { fetchFn } = api({
    "GET /me/blocked": () =>
      Response.json(apiError("session_expired"), { status: 401 }),
  });
  const { sessionEnded } = await show(fetchFn);
  await fireEvent.press(row());
  expect(
    await screen.findByText("Your session has ended. Log in again."),
  ).toBeOnTheScreen();
  expect(sessionEnded).toHaveBeenCalledWith(session.token);
});
