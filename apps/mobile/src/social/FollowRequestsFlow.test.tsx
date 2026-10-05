import people from "@shaperoute/shared-types/fixtures/people.json";
import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { MemorySecureStore } from "../account/testing";
import { ProfileButton, ProfileLayer } from "../screens/ProfileLayer";

// A request to follow as the app shows it (TASK-239): a red number on the
// way to «Profile», «Requests» open under it, «Accept» and «Follow back»
// in the same row, and the number gone.

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
const none = { people: [], next: null, total: 0 };
const one = { people: [adam], next: null, total: 1 };

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

test("the number on the way to «Profile», the answer, the follow back, and no number", async () => {
  store.kept.set(KEY, JSON.stringify(session));
  api({
    "GET /me": () => Response.json(session.user),
    "GET /me/follow-requests?limit=1": () => Response.json(one),
    "GET /me/follow-requests": () => Response.json(one),
    "GET /me/followers": () => Response.json(none),
    "GET /me/following": () => Response.json(none),
    [`POST /me/follow-requests/${adam.public_id}/accept`]: () =>
      new Response(null, { status: 204 }),
    [`GET /users/${adam.public_id}`]: () =>
      Response.json({
        ...publicProfile,
        public_id: adam.public_id,
        username: adam.username,
        photo: null,
        follow: "none",
      }),
    [`POST /users/${adam.public_id}/follow`]: () =>
      Response.json({ follow: "requested" }),
  });
  await render(
    <ProfileLayer apiUrl={API}>
      <ProfileButton />
    </ProfileLayer>,
  );
  const way = await screen.findByRole("button", { name: "Profile, 1 follow request" });
  expect(screen.getByTestId("requests-badge")).toHaveTextContent("1");

  // «Requests» is open: who asks is there without another tap.
  await fireEvent.press(way);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Accept adam.trento" }),
  );
  await fireEvent.press(
    await screen.findByRole("button", { name: "Follow adam.trento back" }),
  );
  expect(await screen.findByTestId("accepted-stands")).toHaveTextContent("Requested");

  // Back in the app nobody waits: the number is gone.
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Profile" })).toBeOnTheScreen(),
  );
  expect(screen.queryByTestId("requests-badge")).toBeNull();
});

test("nobody asks: the way to «Profile» has no number", async () => {
  store.kept.set(KEY, JSON.stringify(session));
  api({
    "GET /me": () => Response.json(session.user),
    "GET /me/follow-requests?limit=1": () => Response.json(none),
  });
  await render(
    <ProfileLayer apiUrl={API}>
      <ProfileButton />
    </ProfileLayer>,
  );
  await waitFor(() =>
    expect(fetchSpy.mock.calls.map(([input]) => String(input))).toContain(
      `${API}/me/follow-requests?limit=1`,
    ),
  );
  expect(screen.getByRole("button", { name: "Profile" })).toBeOnTheScreen();
  expect(screen.queryByTestId("requests-badge")).toBeNull();
});
