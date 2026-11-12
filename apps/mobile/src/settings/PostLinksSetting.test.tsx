import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import { isPostLinksSwitch } from "../api/postLinks";
import { POST_LINKS_NOTE, PostLinksSetting } from "./PostLinksSetting";

// «Links to my posts» in «Settings» (TASK-455 part E, ADR-0382): on from
// the start, kept by the API, with what it does written under it.

const URL = "http://api";
const TOKEN = (session as Session).token;
const NOTE =
  "People who see your «Everyone» posts can share a link to them. Anyone with the link sees the drawing on the map, your username and the distance, even without MuW. Turn this off and the links stop working.";

async function show(fetchFn: jest.Mock, baseUrl: string | null = URL) {
  const sessionEnded = jest.fn();
  await render(
    <PostLinksSetting
      account={{
        state: { status: "signedIn", session: session as Session },
        sessionEnded,
      }}
      api={{ baseUrl, fetchFn, key: null }}
    />,
  );
  return sessionEnded;
}

function calls(fetchFn: jest.Mock) {
  return fetchFn.mock.calls.map(([url, init]) => [url, init.method]);
}

function checked() {
  return screen.getByRole("switch").props.accessibilityState.checked;
}

test("the switch with its approved words, on as the API keeps it", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: { post_links: true } });
  await show(fetchFn);
  const row = await screen.findByRole("switch", { name: "Links to my posts" });
  expect(row.props.accessibilityState).toMatchObject({ checked: true });
  expect(row.props.accessibilityHint).toBe(NOTE);
  expect(screen.getByText(NOTE)).toBeOnTheScreen();
  expect(POST_LINKS_NOTE).toBe(NOTE);
  expect(calls(fetchFn)).toEqual([[`${URL}/me/post-links`, "GET"]]);
  expect(fetchFn.mock.calls[0][1]).toMatchObject({
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
});

test("a touch turns it off, then on again, with the API's answer", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: { post_links: true } },
    { status: 200, body: { post_links: false } },
    { status: 200, body: { post_links: true } },
  );
  await show(fetchFn);
  await fireEvent.press(await screen.findByRole("switch"));
  await waitFor(() => expect(checked()).toBe(false));
  await fireEvent.press(screen.getByRole("switch"));
  await waitFor(() => expect(checked()).toBe(true));
  expect(calls(fetchFn)).toEqual([
    [`${URL}/me/post-links`, "GET"],
    [`${URL}/me/post-links`, "PUT"],
    [`${URL}/me/post-links`, "PUT"],
  ]);
  expect(fetchFn.mock.calls.slice(1).map(([, init]) => JSON.parse(init.body))).toEqual([
    { post_links: false },
    { post_links: true },
  ]);
});

test("a change that does not arrive says why and keeps the switch as it was", async () => {
  await show(
    answers({ status: 200, body: { post_links: true } }, new TypeError("offline")),
  );
  await fireEvent.press(await screen.findByRole("switch"));
  expect(await screen.findByText(/^No connection\./)).toBeOnTheScreen();
  expect(checked()).toBe(true);
});

test("an API older than the links, or none, has no row and no note", async () => {
  const fetchFn: jest.Mock = answers({ status: 404, body: { detail: "Not Found" } });
  await show(fetchFn);
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("switch")).toBeNull();
  expect(screen.queryByText(NOTE)).toBeNull();
  const none = answers();
  await show(none, null);
  expect(none).not.toHaveBeenCalled();
  expect(screen.queryByRole("switch")).toBeNull();
});

test("an ended session is said to the account", async () => {
  const sessionEnded = await show(
    answers({ status: 401, body: apiError("session_expired") }),
  );
  await waitFor(() => expect(sessionEnded).toHaveBeenCalledWith(TOKEN));
  expect(screen.queryByRole("switch")).toBeNull();
});

test("an answer that is not the switch is not taken for one", () => {
  expect(isPostLinksSwitch({ post_links: false })).toBe(true);
  expect(isPostLinksSwitch({ post_links: "yes" })).toBe(false);
  expect(isPostLinksSwitch({})).toBe(false);
  expect(isPostLinksSwitch(null)).toBe(false);
});
