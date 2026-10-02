/**
 * «My activities» (TASK-172): the runs of the account in «Profile», a page
 * at a time, one opened on the map, and deleted with a yes. The hook alone
 * is in src/activities/useActivities.test.ts.
 */
import activities from "@shaperoute/shared-types/fixtures/activities.json";
import activity from "@shaperoute/shared-types/fixtures/activity.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../App";
import { apiError, type MemorySecureStore } from "../src/account/testing";
import { startedLabel } from "../src/activities/activityText";

jest.mock("react-native-webview");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: "192.168.1.23:8081" } },
}));
jest.mock("expo-file-system");
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock("expo-secure-store", () =>
  jest
    .requireActual<typeof import("../src/account/testing")>("../src/account/testing")
    .memorySecureStore(),
);

const { injectJavaScript } =
  jest.requireMock<typeof import("../__mocks__/react-native-webview")>(
    "react-native-webview",
  );
const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
const API = "http://192.168.1.23:8000";
const SESSION_KEY = "shaperoute.session";
const [STAR, FREE] = activities.activities;
/** On the clock of whoever runs the test, as the phone reads it. */
const STAR_WHEN = startedLabel(STAR.started_at);
const FREE_WHEN = startedLabel(FREE.started_at);
const CURSOR = "1789796402000000-3";

let fetchSpy: jest.SpiedFunction<typeof fetch>;

type Answers = Record<string, () => Response>;

/** The fake API, by method and path with its query. */
function api(answers: Answers) {
  fetchSpy.mockImplementation(async (input, init) => {
    const path = String(input).replace(API, "");
    const answer = answers[`${init?.method ?? "GET"} ${path}`];
    return answer !== undefined
      ? answer()
      : Response.json(apiError("http_error", path), { status: 404 });
  });
}

function calls(method: string, path: string) {
  return fetchSpy.mock.calls.filter(
    ([input, init]) =>
      String(input) === `${API}${path}` && (init?.method ?? "GET") === method,
  );
}

function scripts(type: string): string[] {
  return injectJavaScript.mock.calls
    .map(([script]) => String(script))
    .filter((script) => script.includes(`"type":"${type}"`));
}

function signedIn() {
  store.kept.set(SESSION_KEY, JSON.stringify(session));
}

const ACCOUNT: Answers = {
  "GET /me": () => Response.json(session.user),
  "GET /me/favorites": () => Response.json({ favorites: [] }),
};

async function open() {
  await render(<App />);
  await screen.findByText("Starting from your position.");
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
}

async function openActivities() {
  await fireEvent.press(screen.getByRole("button", { name: /^Profile/ }));
  await fireEvent.press(await screen.findByRole("button", { name: /^My activities/ }));
}

beforeEach(() => {
  store.kept.clear();
  injectJavaScript.mockClear();
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: 46.067, longitude: 11.1215 },
  } as Location.LocationObject);
  fetchSpy = jest.spyOn(globalThis, "fetch");
});

afterEach(() => {
  fetchSpy.mockRestore();
});

test("«My activities» in «Profile» lists the runs, with how many they are", async () => {
  signedIn();
  api({ ...ACCOUNT, "GET /me/activities": () => Response.json(activities) });
  await open();
  await fireEvent.press(screen.getByRole("button", { name: /^Profile/ }));
  // Under «Favorites», with its number.
  expect(screen.getByRole("button", { name: "Favorites, 0" })).toBeOnTheScreen();
  await fireEvent.press(
    await screen.findByRole("button", { name: "My activities, 2" }),
  );
  expect(screen.getByRole("header", { name: "My activities" })).toBeOnTheScreen();
  const [auth] = calls("GET", "/me/activities");
  expect(auth[1]?.headers).toMatchObject({ Authorization: `Bearer ${session.token}` });

  // The latest first: the day and the time it began, where, what it drew,
  // how far and how fast, its score.
  expect(screen.getAllByTestId("activity-row")).toHaveLength(2);
  expect(screen.getByText(STAR_WHEN)).toBeOnTheScreen();
  expect(screen.getByText("Trento · Star")).toBeOnTheScreen();
  expect(screen.getByText("4.01 km · 19:00 · 4:45 /km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Score: 91 out of 100")).toBeOnTheScreen();
  // A run without a route, from a place nobody found: no score, no name.
  expect(screen.getByText(FREE_WHEN)).toBeOnTheScreen();
  expect(screen.getByText("Run")).toBeOnTheScreen();
  expect(screen.getByText("2.31 km · 13:35 · 5:53 /km")).toBeOnTheScreen();
  expect(screen.getAllByText(/^Score/)).toHaveLength(1);
  // The drawing: the route and, over it, what was run; a run alone.
  expect(screen.getAllByTestId("run-drawing-route")).toHaveLength(4);
  expect(screen.getAllByTestId("run-drawing-track")).toHaveLength(4 + 2);

  // Back to «Profile», then to the app.
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByText("LOGGED IN AS")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("tab", { name: "Draw", selected: true })).toBeOnTheScreen();
});

test("a run opens on the map, its route under what was run, and goes back to the list", async () => {
  signedIn();
  api({
    ...ACCOUNT,
    "GET /me/activities": () => Response.json(activities),
    [`GET /me/activities/${STAR.id}`]: () => Response.json(activity),
  });
  await open();
  await openActivities();
  await fireEvent.press(
    screen.getByRole("button", {
      name: `${STAR_WHEN}, Trento · Star, 4.01 km · 19:00 · 4:45 /km, open on the map`,
    }),
  );
  // «Profile» gets out of the way: the map, with the run's card under it.
  expect(await screen.findByText("Back to the list")).toBeOnTheScreen();
  expect(screen.queryByRole("header", { name: "My activities" })).toBeNull();
  expect(screen.queryByRole("tab")).toBeNull();
  expect(screen.getByText(STAR_WHEN)).toBeOnTheScreen();
  expect(screen.getByText("Trento · Star")).toBeOnTheScreen();
  expect(screen.getByText("4.01 km · 19:00 · 4:45 /km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Score: 91 out of 100")).toBeOnTheScreen();
  expect(screen.getByText("Yellow: the route. White: what you ran.")).toBeOnTheScreen();
  // Neither a route to keep nor one to start.
  expect(screen.queryByRole("button", { name: /favorites/ })).toBeNull();
  expect(screen.queryByText("Start")).toBeNull();
  // On the map as at the end of a run: the route and the track, whole.
  const [lat, lon] = activity.points[1];
  expect(scripts("showRoute").at(-1)).toContain(`[${lon},${lat}]`);
  expect(scripts("showTrack").at(-1)).toContain(`[${lon},${lat}]`);

  // Back: the list it came from, over the page left under it.
  await fireEvent.press(screen.getByText("Back to the list"));
  expect(screen.getByRole("header", { name: "My activities" })).toBeOnTheScreen();
  expect(screen.getAllByTestId("activity-row")).toHaveLength(2);
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("tab", { name: "Draw", selected: true })).toBeOnTheScreen();
  // The map lets the run go.
  expect(screen.queryByText("Back to the list")).toBeNull();
});

test("the way back on the map goes to the list too; a run without a route has no yellow", async () => {
  signedIn();
  const whole = {
    ...activity,
    id: FREE.id,
    started_at: FREE.started_at,
    place: null,
    shape: null,
    score: null,
    fidelity: null,
    similarity: null,
    points: null,
    distance_m: FREE.distance_m,
    duration_s: FREE.duration_s,
  };
  api({
    ...ACCOUNT,
    "GET /me/activities": () => Response.json(activities),
    [`GET /me/activities/${FREE.id}`]: () => Response.json(whole),
  });
  await open();
  await openActivities();
  const routesBefore = scripts("showRoute").length;
  await fireEvent.press(
    screen.getByRole("button", { name: new RegExp(`^${FREE_WHEN}, Run, `) }),
  );
  expect(await screen.findByText("White: what you ran.")).toBeOnTheScreen();
  expect(screen.queryByText(/out of 100/)).toBeNull();
  expect(scripts("showTrack").length).toBeGreaterThan(0);
  expect(
    scripts("showRoute")
      .slice(routesBefore)
      .every((s) => !s.includes("11.1344")),
  ).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("header", { name: "My activities" })).toBeOnTheScreen();
});

test("a run is deleted from the list only after a yes", async () => {
  signedIn();
  api({
    ...ACCOUNT,
    "GET /me/activities": () => Response.json(activities),
    [`DELETE /me/activities/${STAR.id}`]: () => new Response(null, { status: 204 }),
  });
  await open();
  await openActivities();
  await fireEvent.press(
    screen.getByRole("button", { name: `Delete the run of ${STAR_WHEN}` }),
  );
  expect(screen.getByText("Delete this run? It cannot be undone.")).toBeOnTheScreen();
  // No: the run stays, and nothing is asked.
  await fireEvent.press(screen.getByRole("button", { name: "Keep it" }));
  expect(screen.queryByText("Delete this run? It cannot be undone.")).toBeNull();
  expect(screen.getByText("Trento · Star")).toBeOnTheScreen();
  expect(calls("DELETE", `/me/activities/${STAR.id}`)).toHaveLength(0);
  // Yes: gone at once.
  await fireEvent.press(
    screen.getByRole("button", { name: `Delete the run of ${STAR_WHEN}` }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Delete run" }));
  expect(screen.queryByText("Trento · Star")).toBeNull();
  expect(screen.getAllByTestId("activity-row")).toHaveLength(1);
  await waitFor(() =>
    expect(calls("DELETE", `/me/activities/${STAR.id}`)).toHaveLength(1),
  );
  // And «Profile» counts one fewer.
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("button", { name: "My activities, 1" })).toBeOnTheScreen();
});

test("a run the API does not delete comes back, and says why", async () => {
  signedIn();
  api({
    ...ACCOUNT,
    "GET /me/activities": () => Response.json(activities),
    [`DELETE /me/activities/${FREE.id}`]: () =>
      Response.json(apiError("engine_error", "…"), { status: 500 }),
  });
  await open();
  await openActivities();
  await fireEvent.press(
    screen.getByRole("button", { name: `Delete the run of ${FREE_WHEN}` }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Delete run" }));
  expect(await screen.findByRole("alert")).toBeOnTheScreen();
  expect(screen.getAllByTestId("activity-row")).toHaveLength(2);
});

test("a run is deleted from the map too, and the list is back without it", async () => {
  signedIn();
  let deleted = false;
  api({
    ...ACCOUNT,
    "GET /me/activities": () =>
      Response.json(
        deleted ? { activities: [FREE], next: null, total: 1 } : activities,
      ),
    [`GET /me/activities/${STAR.id}`]: () => Response.json(activity),
    [`DELETE /me/activities/${STAR.id}`]: () => {
      deleted = true;
      return new Response(null, { status: 204 });
    },
  });
  await open();
  await openActivities();
  await fireEvent.press(
    screen.getByRole("button", { name: new RegExp(`^${STAR_WHEN}, `) }),
  );
  await fireEvent.press(await screen.findByRole("button", { name: "Delete" }));
  expect(screen.getByText("Delete this run? It cannot be undone.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Keep it" }));
  expect(screen.getByText("Back to the list")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  await fireEvent.press(screen.getByRole("button", { name: "Delete run" }));
  expect(screen.getByRole("header", { name: "My activities" })).toBeOnTheScreen();
  expect(screen.queryByText("Trento · Star")).toBeNull();
  await waitFor(() =>
    expect(calls("DELETE", `/me/activities/${STAR.id}`)).toHaveLength(1),
  );
  expect(screen.getAllByTestId("activity-row")).toHaveLength(1);
});

test("«Show more» brings the next page", async () => {
  signedIn();
  api({
    ...ACCOUNT,
    "GET /me/activities": () =>
      Response.json({ activities: [STAR], next: CURSOR, total: 2 }),
    [`GET /me/activities?cursor=${CURSOR}`]: () =>
      Response.json({ activities: [FREE], next: null, total: 2 }),
  });
  await open();
  await fireEvent.press(screen.getByRole("button", { name: /^Profile/ }));
  // All of them are counted, not the page.
  await fireEvent.press(
    await screen.findByRole("button", { name: "My activities, 2" }),
  );
  expect(screen.getAllByTestId("activity-row")).toHaveLength(1);
  await fireEvent.press(screen.getByRole("button", { name: "Show more" }));
  await waitFor(() => expect(screen.getAllByTestId("activity-row")).toHaveLength(2));
  expect(screen.getByText(FREE_WHEN)).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
});

test("no activities yet, and a list that does not come", async () => {
  signedIn();
  let down = true;
  api({
    ...ACCOUNT,
    "GET /me/activities": () =>
      down
        ? Response.json(apiError("engine_error", "…"), { status: 500 })
        : Response.json({ activities: [], next: null, total: 0 }),
  });
  await open();
  await openActivities();
  expect(await screen.findByText("Your activities could not load.")).toBeOnTheScreen();
  down = false;
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText(/^No activities yet/)).toBeOnTheScreen();
});

test("a run deleted elsewhere does not open, and says so", async () => {
  signedIn();
  api({ ...ACCOUNT, "GET /me/activities": () => Response.json(activities) });
  await open();
  await openActivities();
  await fireEvent.press(
    screen.getByRole("button", { name: new RegExp(`^${STAR_WHEN}, `) }),
  );
  expect(
    await screen.findByText("This run is no longer in your activities."),
  ).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "My activities" })).toBeOnTheScreen();
});

test("a session that ended while listing signs the app out", async () => {
  signedIn();
  let ended = false;
  api({
    ...ACCOUNT,
    "GET /me/activities": () =>
      ended
        ? Response.json(apiError("session_expired"), { status: 401 })
        : Response.json(activities),
  });
  await open();
  await fireEvent.press(screen.getByRole("button", { name: /^Profile/ }));
  await screen.findByRole("button", { name: "My activities, 2" });
  ended = true;
  await fireEvent.press(screen.getByRole("button", { name: "My activities, 2" }));
  await waitFor(() => expect(store.kept.has(SESSION_KEY)).toBe(false));
  expect(screen.getByText("Your session has ended. Log in again.")).toBeOnTheScreen();
  expect(screen.queryByTestId("activity-row")).toBeNull();
});

test("without an account there are no activities, and nothing is asked", async () => {
  api({});
  await open();
  await fireEvent.press(screen.getByRole("button", { name: /^Profile/ }));
  expect(screen.queryByRole("button", { name: /^My activities/ })).toBeNull();
  expect(calls("GET", "/me/activities")).toHaveLength(0);
});
