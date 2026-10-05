import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import { NO_API } from "../account/messages";
import { answers, apiError } from "../account/testing";
import type { AccountState } from "../account/useAccount";
import {
  drawingsText,
  NO_SUCH_PROFILE,
  SIGN_IN_TO_SEE,
  UserProfilePage,
} from "./UserProfilePage";

// The page as the search of «Feed» opens it (TASK-215); the button to
// follow is in UserProfileFollow.test.tsx.

const URL = "http://api";
const ID = publicProfile.public_id;
const signedIn: AccountState = { status: "signedIn", session: session as Session };

async function show(
  fetchFn: jest.Mock,
  {
    state = signedIn,
    apiUrl = URL,
  }: { state?: AccountState; apiUrl?: string | null } = {},
) {
  const sessionEnded = jest.fn();
  await render(
    <UserProfilePage
      apiUrl={apiUrl}
      account={{ state, sessionEnded }}
      publicId={ID}
      fetchFn={fetchFn}
      apiKey={null}
    />,
  );
  return sessionEnded;
}

test("another member's profile: picture, name, bio and drawings, read only", async () => {
  const fetchFn = answers({ status: 200, body: publicProfile });
  await show(fetchFn);
  expect(await screen.findByText("Ada_runs")).toBeOnTheScreen();
  expect(screen.getByText(publicProfile.bio)).toBeOnTheScreen();
  expect(screen.getByText("0 drawings · 12 followers · 9 following")).toBeOnTheScreen();
  expect(screen.getByTestId("avatar-photo")).toHaveProp("source", {
    uri: `data:image/jpeg;base64,${publicProfile.photo}`,
  });
  // The fixtures' profile is the account's own: not even the button to follow.
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${URL}/users/${ID}`);
  expect(init).toMatchObject({
    method: "GET",
    headers: { Authorization: `Bearer ${session.token}` },
  });
});

test("never an email, even if an answer carried one", async () => {
  const fetchFn = answers({
    status: 200,
    body: { ...publicProfile, photo: null, email: "ada@example.com" },
  });
  await show(fetchFn);
  expect(await screen.findByText("Ada_runs")).toBeOnTheScreen();
  expect(screen.queryByText(/@example\.com/)).toBeNull();
  // Without a picture, the initial.
  expect(screen.getByText("A")).toBeOnTheScreen();
});

test("while it comes, the page says so", async () => {
  const fetchFn = jest.fn(() => new Promise<Response>(() => {}));
  await show(fetchFn);
  expect(screen.getByText("Loading the profile…")).toBeOnTheScreen();
});

test("an unknown profile, or an API without profiles, is not available", async () => {
  await show(answers({ status: 404, body: apiError("http_error", "Not Found") }));
  expect(await screen.findByText(NO_SUCH_PROFILE)).toBeOnTheScreen();
});

test("a session that ended signs out and says so", async () => {
  const sessionEnded = await show(
    answers({ status: 401, body: apiError("session_expired") }),
  );
  expect(
    await screen.findByText("Your session has ended. Log in again."),
  ).toBeOnTheScreen();
  expect(sessionEnded).toHaveBeenCalledWith(session.token);
});

test("signed out, or without an API, nothing is asked", async () => {
  const fetchFn = answers();
  await show(fetchFn, { state: { status: "signedOut", notice: null } });
  expect(screen.getByText(SIGN_IN_TO_SEE)).toBeOnTheScreen();
  await show(fetchFn, { apiUrl: null });
  expect(screen.getByText(NO_API)).toBeOnTheScreen();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("one drawing, or many", () => {
  expect(drawingsText(0)).toBe("0 drawings");
  expect(drawingsText(1)).toBe("1 drawing");
  expect(drawingsText(12)).toBe("12 drawings");
});
