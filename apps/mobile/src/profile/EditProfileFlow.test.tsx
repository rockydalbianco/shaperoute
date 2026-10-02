import session from "@shaperoute/shared-types/fixtures/session.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { apiError, type MemorySecureStore } from "../account/testing";
import { ProfileButton, ProfileLayer } from "../screens/ProfileLayer";

// «Edit profile» in «Profile» as the app has it (TASK-116): the change
// shows on «Profile», in the button at the top and in «Settings» without
// opening the app again, and the next opening finds it in the keychain.

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
const EDITED = {
  ...session.user,
  username: "Ada_runs",
  bio: "Hearts on Sunday mornings.",
};

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

function patches() {
  return fetchSpy.mock.calls.filter(([, init]) => init?.method === "PATCH");
}

beforeEach(() => {
  store.kept.clear();
  store.kept.set(KEY, JSON.stringify(session));
  fetchSpy = jest.spyOn(globalThis, "fetch");
});

afterEach(() => {
  fetchSpy.mockRestore();
});

async function openEdit() {
  await render(
    <ProfileLayer apiUrl={API}>
      <ProfileButton />
    </ProfileLayer>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Profile" }));
  expect(await screen.findByText("Runner_42")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Edit profile" }));
  expect(screen.getByRole("header", { name: "Edit profile" })).toBeOnTheScreen();
}

test("a profile edited shows at once on «Profile», and is kept", async () => {
  api({
    "GET /me": () => Response.json(session.user),
    "PATCH /me": () => Response.json(EDITED),
  });
  await openEdit();
  await fireEvent.changeText(screen.getByLabelText("username"), "Ada_runs");
  await fireEvent.changeText(screen.getByLabelText("bio"), EDITED.bio);
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByRole("header", { name: "Profile" })).toBeOnTheScreen();
  expect(screen.getByText("Ada_runs")).toBeOnTheScreen();
  expect(screen.getByText(EDITED.bio)).toBeOnTheScreen();
  expect(screen.queryByText("Runner_42")).toBeNull();
  expect(JSON.parse(String(patches()[0][1]?.body))).toEqual({
    username: "Ada_runs",
    bio: EDITED.bio,
  });
  expect(JSON.parse(store.kept.get(KEY)!)).toEqual({
    token: session.token,
    user: EDITED,
  });
  // «Settings» has the new name too.
  await fireEvent.press(screen.getByRole("button", { name: "Settings" }));
  expect(screen.getByText("Ada_runs")).toBeOnTheScreen();
  // And the button at the top its first letter, once «Profile» is closed.
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("button", { name: "Profile" })).toHaveTextContent("A");
});

test("on today's server, without PATCH /me, the page says so and nothing changes", async () => {
  api({
    // An API older than TASK-116: no bio, no public id, no PATCH.
    "GET /me": () => {
      const { bio: _bio, public_id: _id, ...before } = session.user;
      return Response.json(before);
    },
    "PATCH /me": () =>
      Response.json(apiError("http_error", "Method Not Allowed"), { status: 405 }),
  });
  await openEdit();
  await fireEvent.changeText(screen.getByLabelText("bio"), "Hi");
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
  expect(
    await screen.findByText("Editing the profile is not available on this API yet."),
  ).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Edit profile" })).toBeOnTheScreen();
  expect(screen.getByLabelText("bio")).toHaveDisplayValue("Hi");
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByText("Runner_42")).toBeOnTheScreen();
  expect(screen.queryByText("Hi")).toBeNull();
});
