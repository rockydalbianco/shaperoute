import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { PublicProfile, Session, User } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { FollowsContext } from "../social/followsDoor";
import { ProfileHome } from "./ProfileHome";

// A new profile (TASK-457): the first step where the totals and the week
// would count zeros, and «Badges» with how each is earned.

const URL = "http://api";
const ID = publicProfile.public_id;
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const NOTHING_DONE: PublicProfile = {
  ...(publicProfile as PublicProfile),
  distance_m: 0,
  climb_m: 0,
  reactions: 0,
  badges: [],
};

/** The API of the profile: `profile` for the account, empty lists for the rest. */
function api(profile: PublicProfile) {
  jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (url: string | URL | Request) =>
      String(url) === `${URL}/users/${ID}`
        ? Response.json(profile)
        : Response.json({ people: [], next: null, total: 0 }),
    );
}

async function show(activities: number | null) {
  const onExplore = jest.fn();
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <ProfileHome
        user={session.user as User}
        favorites={0}
        activities={activities}
        onOpen={jest.fn()}
        onEdit={jest.fn()}
        onExplore={onExplore}
      />
    </FollowsContext.Provider>,
  );
  // The profile and the lists answer.
  await act(async () => {});
  return onExplore;
}

afterEach(() => {
  jest.restoreAllMocks();
});

test("nothing done yet: the first step, no totals and no week", async () => {
  api(NOTHING_DONE);
  const onExplore = await show(0);
  expect(await screen.findByTestId("first-step")).toBeOnTheScreen();
  expect(screen.queryByTestId("profile-stats")).toBeNull();
  expect(screen.queryByTestId("week-strip")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Find a route near you" }));
  expect(onExplore).toHaveBeenCalledTimes(1);
});

test("with an activity the totals are there and the first step is not", async () => {
  api(publicProfile as PublicProfile);
  await show(5);
  expect(await screen.findByTestId("profile-stats")).toBeOnTheScreen();
  expect(screen.queryByTestId("first-step")).toBeNull();
});

test("a gym workout alone is an activity: the totals, at zero, and no first step", async () => {
  api(NOTHING_DONE);
  await show(1);
  expect(await screen.findByTestId("profile-stats")).toBeOnTheScreen();
  expect(screen.queryByTestId("first-step")).toBeNull();
});

test("until the activities have come: neither zeros nor the first step", async () => {
  api(NOTHING_DONE);
  await show(null);
  expect(screen.getByTestId("badges-section")).toBeOnTheScreen();
  expect(screen.queryByTestId("profile-stats")).toBeNull();
  expect(screen.queryByTestId("first-step")).toBeNull();
});

test("«Badges» lists the three badges, those to earn behind a lock", async () => {
  api({ ...NOTHING_DONE, badges: ["first_drawing"] });
  await show(1);
  expect(await screen.findByTestId("badges-section")).toBeOnTheScreen();
  expect(screen.getByTestId("badges-first_drawing")).toHaveTextContent(/^✏️/);
  expect(screen.getByTestId("badges-long_drawing")).toHaveTextContent(/^🔒/);
  // Under the name, only the one earned.
  expect(screen.getByTestId("badge-first_drawing")).toBeOnTheScreen();
  expect(screen.queryByTestId("badge-long_drawing")).toBeNull();
});

test("an API older than the totals leaves the profile as it was", async () => {
  const { distance_m: _d, climb_m: _c, reactions: _r, ...older } = NOTHING_DONE;
  api(older);
  await show(0);
  expect(screen.queryByTestId("first-step")).toBeNull();
  expect(screen.queryByTestId("profile-stats")).toBeNull();
});
