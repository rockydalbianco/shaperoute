import people from "@shaperoute/shared-types/fixtures/people.json";
import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { MemorySecureStore } from "../account/testing";
import { ProfileButton, ProfileLayer } from "../screens/ProfileLayer";

// Following as the app has it (TASK-211): «Profile» shows who asks to
// follow, a name opens that member's profile over it, with the button to
// follow back, and back comes to «Profile».

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-secure-store", () =>
  jest
    .requireActual<typeof import("../account/testing")>("../account/testing")
    .memorySecureStore(),
);

const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
const API = "http://192.168.1.23:8000";
const KEY = "shaperoute.session";
const [, adam] = people.people;
const ADAM = {
  ...publicProfile,
  public_id: adam.public_id,
  username: adam.username,
  photo: null,
  followers: 0,
  following: 3,
  follow: "none",
};
const none = { people: [], next: null, total: 0 };

let fetchSpy: jest.SpiedFunction<typeof fetch>;

/** The fake API, by method and path; the rest is out of reach. */
function api(answers: Record<string, () => Response>) {
  fetchSpy.mockImplementation(async (input, init) => {
    const path = String(input).replace(API, "");
    const answer = answers[`${init?.method ?? "GET"} ${path}`];
    if (answer === undefined) {
      throw new Error(`Not in this test: ${init?.method ?? "GET"} ${path}`);
    }
    return answer();
  });
}

beforeEach(() => {
  store.kept.clear();
  fetchSpy = jest.spyOn(globalThis, "fetch");
});

afterEach(() => {
  fetchSpy.mockRestore();
});

test("from a request in «Profile» to who asks, to follow back, and back", async () => {
  store.kept.set(KEY, JSON.stringify(session));
  api({
    "GET /me": () => Response.json(session.user),
    "GET /me/follow-requests": () =>
      Response.json({ people: [adam], next: null, total: 1 }),
    "GET /me/followers": () => Response.json(none),
    "GET /me/following": () => Response.json(none),
    [`GET /users/${adam.public_id}`]: () => Response.json(ADAM),
    [`POST /users/${adam.public_id}/follow`]: () =>
      Response.json({ follow: "requested" }),
  });
  await render(
    <ProfileLayer apiUrl={API}>
      <ProfileButton />
    </ProfileLayer>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Profile" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Requests, 1" }));
  await fireEvent.press(screen.getByRole("button", { name: "adam.trento" }));

  // The member's profile, over the app: no search under it.
  expect(await screen.findByText(/0 followers/)).toBeOnTheScreen();
  expect(screen.queryByPlaceholderText("Name")).toBeNull();
  expect(screen.queryByRole("button", { name: "Requests, 1" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Follow" }));
  expect(await screen.findByRole("button", { name: "Requested" })).toBeOnTheScreen();

  // Back once: «Profile», with its numbers asked again.
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(await screen.findByRole("button", { name: "Requests, 1" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Edit profile" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Requested" })).toBeNull();
});
