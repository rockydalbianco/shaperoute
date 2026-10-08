import activities from "@shaperoute/shared-types/fixtures/activities.json";
import runPostRequest from "@shaperoute/shared-types/fixtures/run-post-request.json";
import runPost from "@shaperoute/shared-types/fixtures/run-post.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { renderHook, waitFor } from "@testing-library/react-native";

import { apiError } from "../account/testing";
import type { Account } from "../account/useAccount";
import { useActivitiesOf } from "./activitiesDoor";

// The post of a run, as shared, to the API (TASK-258): one PUT, nothing
// waited for, a session that ended heard.

jest.mock("expo-file-system");

const URL = "http://api";
const signedIn = session as Session;
const doors = { onList: jest.fn(), onAccount: jest.fn(), onOpened: jest.fn() };

function account(state: Account["state"] = { status: "signedIn", session: signedIn }) {
  return {
    state,
    busy: null,
    problem: null,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    editProfile: jest.fn(),
    changeEmail: jest.fn(),
    changePhone: jest.fn(),
    changeNotifications: jest.fn(),
    clearProblem: jest.fn(),
    sessionEnded: jest.fn(),
  } as Account;
}

/** A fetch that answers the list with the fixture and a post's PUT with
 * `post`. */
function api(post: { status: number; body: unknown }) {
  const puts: [string, RequestInit | undefined][] = [];
  const fetchFn: jest.Mock = jest.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PUT") {
      puts.push([url, init]);
      return Response.json(post.body, { status: post.status });
    }
    return Response.json(activities, { status: 200 });
  });
  return { fetchFn, puts };
}

afterEach(() => jest.restoreAllMocks());

test("the post goes under its run's key, with the token", async () => {
  const { fetchFn, puts } = api({ status: 200, body: runPost });
  // One account for every render: a new one each time would start over.
  const me = account();
  const { result } = await renderHook(() =>
    useActivitiesOf(URL, me, doors, { fetchFn, key: null }),
  );
  result.current.keepPost("7c2e91a4b05d3f68", runPostRequest);
  await waitFor(() => expect(puts).toHaveLength(1));
  const [url, init] = puts[0];
  expect(url).toBe("http://api/me/activities/7c2e91a4b05d3f68/post");
  expect(init).toMatchObject({
    headers: { Authorization: `Bearer ${signedIn.token}` },
  });
  expect(JSON.parse(String(init?.body))).toEqual(runPostRequest);
});

test("a session that ended is heard; any other refusal is let go", async () => {
  const ended = account();
  const { fetchFn, puts } = api({
    status: 401,
    body: apiError("session_expired", "Session expired."),
  });
  const { result } = await renderHook(() =>
    useActivitiesOf(URL, ended, doors, { fetchFn, key: null }),
  );
  result.current.keepPost("7c2e91a4b05d3f68", runPostRequest);
  await waitFor(() => expect(ended.sessionEnded).toHaveBeenCalledWith(signedIn.token));
  expect(puts).toHaveLength(1);

  const fine = account();
  const refused = api({ status: 404, body: apiError("not_found", "No activity.") });
  const { result: other } = await renderHook(() =>
    useActivitiesOf(URL, fine, doors, { fetchFn: refused.fetchFn, key: null }),
  );
  other.current.keepPost("7c2e91a4b05d3f68", runPostRequest);
  await waitFor(() => expect(refused.puts).toHaveLength(1));
  expect(fine.sessionEnded).not.toHaveBeenCalled();
  expect(other.current.problem).toBeNull();
});

test("without anybody signed in, or without an API, nothing is sent", async () => {
  const { fetchFn } = api({ status: 200, body: runPost });
  const out = account({ status: "signedOut", notice: null });
  const { result } = await renderHook(() =>
    useActivitiesOf(URL, out, doors, { fetchFn, key: null }),
  );
  result.current.keepPost("7c2e91a4b05d3f68", runPostRequest);
  const me = account();
  const { result: offline } = await renderHook(() =>
    useActivitiesOf(null, me, doors, { fetchFn, key: null }),
  );
  offline.current.keepPost("7c2e91a4b05d3f68", runPostRequest);
  expect(fetchFn.mock.calls.filter(([, init]) => init?.method === "PUT")).toEqual([]);
});
