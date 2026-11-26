import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { PublicProfile, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import type { AccountState } from "../account/useAccount";
import { profileDetail, UserProfilePage } from "./UserProfilePage";

// The night a member shares has its own tests (UserProfileSleep.test.tsx):
// here it asks nothing, so the answers stay in their order.
jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: () => false,
}));

// The answers here are the profile's, in order: its gear (TASK-486) is
// gear/ProfileGear's.
jest.mock("../gear/gearOn", () => ({ GEAR_ON: false }));

// Following from another member's profile (TASK-211, ADR-0173): «Follow»
// asks, «Requested» takes it back, «Following» stops after asking.

const URL = "http://api";
// Another member's: the profile of the fixtures has the id of their account.
const ID = "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const profile = { ...publicProfile, public_id: ID } as PublicProfile;

/** The page's own requests go to `fetchFn`, in order; its group runs
 * (TASK-309 part B) get the 404 of an API of before, apart. */
function apart(fetchFn: jest.Mock): typeof fetch {
  return (async (url: string, init?: RequestInit) =>
    String(url).endsWith("/group-runs")
      ? Response.json(
          {
            error: {
              code: "http_error",
              message: "Not Found",
              suggested_distance_m: null,
              reason: null,
            },
          },
          { status: 404 },
        )
      : fetchFn(url, init)) as typeof fetch;
}

async function show(fetchFn: jest.Mock) {
  const sessionEnded = jest.fn();
  await render(
    <UserProfilePage
      apiUrl={URL}
      account={{ state: signedIn, sessionEnded }}
      publicId={ID}
      fetchFn={apart(fetchFn)}
      apiKey={null}
    />,
  );
  return sessionEnded;
}

test("«Follow» asks, and the button says the request is waiting", async () => {
  const fetchFn = answers(
    { status: 200, body: { ...profile, follow: "none" } },
    { status: 200, body: { follow: "requested" } },
  );
  await show(fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Follow" }));
  expect(await screen.findByRole("button", { name: "Requested" })).toBeOnTheScreen();
  // Asking is not following: the number stays.
  expect(screen.getByText(/12 followers/)).toBeOnTheScreen();
  const [url, init] = fetchFn.mock.calls[1];
  expect(url).toBe(`${URL}/users/${ID}/follow`);
  expect(init).toMatchObject({
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
  });
});

test("«Requested» takes the request back at once", async () => {
  const fetchFn = answers(
    { status: 200, body: { ...profile, follow: "requested" } },
    { status: 204 },
  );
  await show(fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Requested" }));
  expect(await screen.findByRole("button", { name: "Follow" })).toBeOnTheScreen();
  expect(fetchFn.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
});

test("«Following» asks before it stops, and then counts one follower less", async () => {
  const fetchFn = answers({ status: 200, body: profile }, { status: 204 });
  await show(fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Following" }));
  expect(screen.getByText("Stop following Ada_runs?")).toBeOnTheScreen();
  expect(fetchFn).toHaveBeenCalledTimes(1);

  // «Keep it» changes nothing.
  await fireEvent.press(screen.getByRole("button", { name: "Keep it" }));
  expect(fetchFn).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Following" }));
  await fireEvent.press(screen.getByRole("button", { name: "Unfollow" }));
  expect(await screen.findByRole("button", { name: "Follow" })).toBeOnTheScreen();
  expect(screen.getByText(/11 followers/)).toBeOnTheScreen();
  const [url, init] = fetchFn.mock.calls[1];
  expect(url).toBe(`${URL}/users/${ID}/follow`);
  expect(init).toMatchObject({ method: "DELETE" });
});

test("a request that did not go leaves the button as it was, and says why", async () => {
  const fetchFn = answers(
    { status: 200, body: { ...profile, follow: "none" } },
    new Error("offline"),
  );
  await show(fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Follow" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Cannot reach the API/);
  expect(screen.getByRole("button", { name: "Follow" })).toBeOnTheScreen();
});

test("a session that ended while following signs out", async () => {
  const fetchFn = answers(
    { status: 200, body: { ...profile, follow: "none" } },
    { status: 401, body: apiError("session_expired") },
  );
  const sessionEnded = await show(fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Follow" }));
  expect(await screen.findByRole("alert")).toBeOnTheScreen();
  expect(sessionEnded).toHaveBeenCalledWith(session.token);
});

test("no button on one's own profile, nor with an API older than following", async () => {
  const mine: Session = {
    ...(session as Session),
    user: { ...(session as Session).user, public_id: ID },
  };
  const ownFetch: jest.Mock = answers({
    status: 200,
    body: { ...profile, follow: "none" },
  });
  const own = await render(
    <UserProfilePage
      apiUrl={URL}
      account={{
        state: { status: "signedIn", session: mine },
        sessionEnded: jest.fn(),
      }}
      publicId={ID}
      fetchFn={apart(ownFetch)}
      apiKey={null}
    />,
  );
  expect(await screen.findByText("Ada_runs")).toBeOnTheScreen();
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  await own.unmount();

  const { public_id, username, bio, photo, drawings } = profile;
  await show(
    answers({ status: 200, body: { public_id, username, bio, photo, drawings } }),
  );
  expect(await screen.findByText("0 drawings")).toBeOnTheScreen();
  expect(screen.queryAllByRole("button")).toHaveLength(0);
});

test("the line under the name: drawings, followers, following", () => {
  expect(profileDetail({ drawings: 1, followers: 1, following: 0 })).toBe(
    "1 drawing · 1 follower · 0 following",
  );
  expect(profileDetail({ drawings: 3 })).toBe("3 drawings");
});
