import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";
import type { Session } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";

import { apiError } from "../account/testing";
import type { AccountState } from "../account/useAccount";
import { without } from "../health/sleepEnd.testing";
import { sleepPostsOn } from "../health/sleepModules";
import { UserProfilePage } from "./UserProfilePage";

// The sleep on a member's profile (TASK-467 part B3), and the
// Coordinatore's condition: while the sleep is off, as in every build until
// part C, the page is drawn exactly as before and the API is asked nothing
// about the sleep, even for a member who shares a night.

jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => false),
}));

const on = jest.mocked(sleepPostsOn);
const URL = "http://api";
const ID = publicProfile.public_id;
const signedIn: AccountState = { status: "signedIn", session: session as Session };

/** The API of a profile: `night` is what it shares, or nothing. */
function api(night: unknown) {
  return jest.fn(async (url: string, _init?: RequestInit) => {
    if (url === `${URL}/users/${ID}`) {
      return Response.json(publicProfile);
    }
    if (url === `${URL}/users/${ID}/sleep` && night !== null) {
      return Response.json(night);
    }
    return Response.json(apiError("http_error"), { status: 404 });
  }) as jest.Mock & typeof fetch;
}

/** The page as it is drawn, without the node `testID`: to compare. */
const drawn = (tree: unknown, testID: string) => JSON.stringify(without(tree, testID));

async function show(fetchFn: typeof fetch) {
  await render(
    <UserProfilePage
      apiUrl={URL}
      account={{ state: signedIn, sessionEnded: jest.fn() }}
      publicId={ID}
      fetchFn={fetchFn}
      apiKey={null}
    />,
  );
  // The profile, then what is under it.
  await act(async () => {});
  await act(async () => {});
}

function asked(fetchFn: jest.Mock): string[] {
  return fetchFn.mock.calls.map(([url]) => String(url));
}

test("off: no sleep on the profile, and the API is asked nothing about it", async () => {
  on.mockReturnValue(false);
  const fetchFn = api(summary);
  await show(fetchFn);
  expect(await screen.findByText("Ada_runs")).toBeOnTheScreen();
  expect(screen.queryByTestId("profile-sleep")).toBeNull();
  expect(screen.queryByText("Sleep score")).toBeNull();
  expect(asked(fetchFn)).toContain(`${URL}/users/${ID}`);
  expect(asked(fetchFn).filter((url) => /sleep/.test(url))).toEqual([]);
});

test("off, the page is drawn exactly as before: on, only the night is added", async () => {
  on.mockReturnValue(false);
  await show(api(summary));
  const before = screen.toJSON();
  await screen.unmount();

  on.mockReturnValue(true);
  const fetchFn = api(summary);
  await show(fetchFn);
  expect(await screen.findByTestId("profile-sleep")).toBeOnTheScreen();
  expect(screen.getByText("82 · Very good")).toBeOnTheScreen();
  expect(screen.getByText("21 Sep")).toBeOnTheScreen();
  expect(asked(fetchFn)).toContain(`${URL}/users/${ID}/sleep`);
  // Nothing but the night moved; off, there was nothing to take away.
  expect(drawn(screen.toJSON(), "profile-sleep")).toBe(drawn(before, "profile-sleep"));
  expect(drawn(before, "profile-sleep")).toBe(drawn(before, "none-such"));
  expect(drawn(screen.toJSON(), "none-such")).not.toBe(drawn(before, "none-such"));
});

test("on, a member who shares no night has no sleep on the profile", async () => {
  on.mockReturnValue(true);
  const fetchFn = api(null);
  await show(fetchFn);
  expect(await screen.findByText("Ada_runs")).toBeOnTheScreen();
  expect(asked(fetchFn)).toContain(`${URL}/users/${ID}/sleep`);
  expect(screen.queryByTestId("profile-sleep")).toBeNull();
  expect(screen.queryByText("Sleep score")).toBeNull();
});
