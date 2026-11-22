/**
 * The page of the post of a night of sleep (TASK-467 part E): the night
 * with the line of whose score it is, and on one's own post «Remove post»,
 * which takes it off the Feed.
 */
import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { apiError } from "../account/testing";
import type { AccountState } from "../account/useAccount";
import { sleepPostsOn } from "../health/sleepModules";
import { MessagesContext, type MessagesDoor } from "../messages/messagesDoor";
import { FollowsContext } from "../social/followsDoor";
import { shownPost } from "./feedPosts";
import { SLEEP_POST_DETAIL_TEST_ID, SleepPostDetailPage } from "./SleepPostDetailPage";
import { sleepFeedPost } from "./sleepPost.testing";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => true),
}));

const on = jest.mocked(sleepPostsOn);
const API = "http://api";
const signedIn = session as Session;
const SIGNED_IN: AccountState = { status: "signedIn", session: signedIn };
const NOTE =
  "Worked out by MuW from Apple Health data. It can differ from the score in the Health app.";
const REMOVE = `${API}/me/sleep-posts/${summary.night}`;

const ME = signedIn.user.public_id;
if (ME === undefined) {
  throw new Error("The session of the test has a public id");
}
const MY_ID: string = ME;

/** The post of the account signed in, or of another member. */
function post(mine: boolean) {
  const one = sleepFeedPost();
  return shownPost(
    mine ? { ...one, author: { ...one.author, public_id: MY_ID } } : one,
  );
}

function messages(): MessagesDoor {
  return {
    apiUrl: API,
    account: { state: SIGNED_IN, sessionEnded: jest.fn() },
    screen: null,
    openList: jest.fn(),
    openConversation: jest.fn(),
    back: jest.fn(),
    close: jest.fn(),
    unread: { unread: 0, requests: 0 },
    recount: jest.fn(),
  };
}

function around(children: React.ReactNode, sessionEnded = jest.fn()) {
  return (
    <MessagesContext.Provider value={messages()}>
      <FollowsContext.Provider
        value={{
          apiUrl: API,
          account: { state: SIGNED_IN, sessionEnded },
          openProfile: () => {},
        }}
      >
        {children}
      </FollowsContext.Provider>
    </MessagesContext.Provider>
  );
}

function api(status: number, body?: unknown) {
  return jest.fn(async (_url: string, _init?: RequestInit) =>
    body === undefined
      ? new Response(null, { status })
      : Response.json(body, { status }),
  ) as jest.Mock & typeof fetch;
}

/** Opens the settings under the bar, then «Remove post». */
async function removePost() {
  await fireEvent.press(screen.getByTestId("post-sheet-handle"));
  await fireEvent.press(screen.getByTestId("sleep-post-remove"));
  await act(async () => {});
}

beforeEach(() => {
  on.mockReturnValue(true);
});

test("the page says who, the night and whose score it is", async () => {
  await render(around(<SleepPostDetailPage post={post(false)} onClose={() => {}} />));
  expect(screen.getByTestId(SLEEP_POST_DETAIL_TEST_ID)).toBeTruthy();
  expect(screen.getByText("ada")).toBeTruthy();
  expect(screen.getByText("82 · Very good")).toBeTruthy();
  expect(screen.getByText("7 h 32 min")).toBeTruthy();
  expect(screen.getByText(NOTE)).toBeTruthy();
  expect(screen.getByTestId("post-like")).toBeTruthy();
  // Never an hour of going to bed or of waking.
  expect(screen.queryByText(/\d{1,2}:\d{2}/)).toBeNull();
});

test("another member's post has no «Remove post»", async () => {
  await render(around(<SleepPostDetailPage post={post(false)} onClose={() => {}} />));
  expect(screen.queryByTestId("sleep-post-remove")).toBeNull();
  expect(screen.queryByText("Remove post")).toBeNull();
});

test("«Back» closes the page", async () => {
  const onClose = jest.fn();
  await render(around(<SleepPostDetailPage post={post(false)} onClose={onClose} />));
  await fireEvent.press(screen.getByTestId("post-back"));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("on one's own, «Remove post» takes it off by its night and closes the page", async () => {
  const fetchFn = api(204);
  const onClose = jest.fn();
  const onRemoved = jest.fn();
  await render(
    around(
      <SleepPostDetailPage
        post={post(true)}
        onClose={onClose}
        onRemoved={onRemoved}
        fetchFn={fetchFn}
        apiKey={null}
      />,
    ),
  );
  await removePost();
  expect(fetchFn).toHaveBeenCalledTimes(1);
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(REMOVE);
  expect(init?.method).toBe("DELETE");
  expect(onRemoved).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("a removal that fails says so and leaves the page open", async () => {
  const fetchFn = api(500, apiError("http_error"));
  const onClose = jest.fn();
  const onRemoved = jest.fn();
  await render(
    around(
      <SleepPostDetailPage
        post={post(true)}
        onClose={onClose}
        onRemoved={onRemoved}
        fetchFn={fetchFn}
        apiKey={null}
      />,
    ),
  );
  await removePost();
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(onRemoved).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test("a session that ended is told to the account", async () => {
  const fetchFn = api(401, apiError("session_expired"));
  const sessionEnded = jest.fn();
  await render(
    around(
      <SleepPostDetailPage
        post={post(true)}
        onClose={() => {}}
        fetchFn={fetchFn}
        apiKey={null}
      />,
      sessionEnded,
    ),
  );
  await removePost();
  expect(sessionEnded).toHaveBeenCalledWith(signedIn.token);
});

test("off: no page", async () => {
  on.mockReturnValue(false);
  await render(around(<SleepPostDetailPage post={post(true)} onClose={() => {}} />));
  expect(screen.queryByTestId(SLEEP_POST_DETAIL_TEST_ID)).toBeNull();
});
