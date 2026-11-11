/**
 * «Edit & run» on the Feed (TASK-410, ADR-0340): on the card and on the
 * page of a post, the line of the run goes on the map of «Draw on the map»
 * where it was run, to change and run. The page goes first: left open, a
 * modal, it stayed over the map and the button seemed to do nothing.
 */
import drawing from "@shaperoute/shared-types/fixtures/drawing-details.json";
import feed from "@shaperoute/shared-types/fixtures/feed.json";
import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";
import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../App";
import { apiError, type MemorySecureStore } from "../src/account/testing";
import { forgetFeed } from "../src/feed/useFeed";
import { SAMPLE_FEED } from "../src/feed/sampleFeed";
import { loadSport } from "../src/settings/sport";

// Every test renders the whole app, and the first one loads it cold.
jest.setTimeout(20_000);

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
// The sport kept on the phone, as each test says.
jest.mock("../src/settings/sport", () => ({
  ...jest.requireActual<typeof import("../src/settings/sport")>(
    "../src/settings/sport",
  ),
  loadSport: jest.fn(),
}));

const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
const API = "http://192.168.1.23:8000";
const SESSION_KEY = "shaperoute.session";
const HERE: [number, number] = [46.067, 11.1215];
// The «All» tab: never with the phone's position (TASK-362).
const FEED = "/feed?filter=all";

// The second drawing of the sample feed, opened as a route of «Explore».
const POST = SAMPLE_FEED[1];
const ROUTE = { ...detail, id: POST.id, route_m: POST.route_m };

/** The route of a drawing: the engine says neither a shape nor a word. */
const DRAWING_DONE = {
  ...jobDone,
  result: { ...jobDone.result, shape: null, word: null },
};

let fetchSpy: jest.SpiedFunction<typeof fetch>;
/** What the API has under the id of the sample post. */
let underItsId: () => Response;
/** What the API has under the id of the member's drawing. */
let theDrawing: () => Response;

async function onFeed() {
  await render(<App />);
  await screen.findByText("Starting from your position.");
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
  await fireEvent.press(screen.getByRole("tab", { name: "Feed" }));
}

beforeEach(() => {
  store.kept.clear();
  forgetFeed();
  jest.mocked(loadSport).mockReturnValue("run");
  underItsId = () => Response.json(ROUTE);
  theDrawing = () => Response.json(drawing);
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: HERE[0], longitude: HERE[1] },
  } as Location.LocationObject);
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const path = String(input).replace(API, "");
    const method = init?.method ?? "GET";
    if (method === "GET" && path.startsWith("/recommended-routes/")) {
      return underItsId();
    }
    if (method === "GET" && path.startsWith("/recommended-routes")) {
      return Response.json(list);
    }
    // A figure's route: accepted, and done at the first poll, read as any
    // job.
    if (method === "POST" && path === "/image-route-jobs") {
      return Response.json(
        { job_id: "4f2c9e1a", status: "queued", result: null, error: null },
        { status: 202 },
      );
    }
    if (method === "GET" && path === "/route-jobs/4f2c9e1a") {
      return Response.json(DRAWING_DONE);
    }
    // «Save» after an edit: the route kept as the heart keeps it.
    if (method === "PUT" && path.startsWith("/me/favorites/")) {
      const kept = JSON.parse(String(init?.body));
      return Response.json(
        {
          ...kept,
          start: kept.points[0],
          preview: kept.points,
          id: path.slice("/me/favorites/".length),
          created_at: "2026-11-10T09:00:00Z",
        },
        { status: 201 },
      );
    }
    const answers: Record<string, () => Response> = {
      "GET /me": () => Response.json(session.user),
      "GET /me/favorites": () => Response.json({ favorites: [] }),
      "GET /me/activities": () =>
        Response.json({ activities: [], next: null, total: 0 }),
      [`GET ${FEED}`]: () => Response.json(feed),
      [`GET /drawings/${drawing.id}`]: () => theDrawing(),
    };
    const answer = answers[`${method} ${path}`];
    return answer !== undefined
      ? answer()
      : Response.json(apiError("http_error", path), { status: 404 });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** The member's post of the feed, its page open. */
async function onPage() {
  store.kept.set(SESSION_KEY, JSON.stringify(session));
  await onFeed();
  await fireEvent.press(await screen.findByText(String(feed.posts[0].title)));
  await screen.findByTestId("post-page");
}

/** The map of «Draw on the map», ready to draw on. */
function onTheCanvas() {
  expect(screen.getByText("Undo")).toBeOnTheScreen();
  expect(
    screen.getByText("Each new line joins the drawing. Two fingers move the map."),
  ).toBeOnTheScreen();
}

test("«Edit & run» on a card of the Feed puts its line on the map", async () => {
  store.kept.set(SESSION_KEY, JSON.stringify(session));
  await onFeed();
  await screen.findByText(String(feed.posts[0].title));
  const before = fetchSpy.mock.calls.length;

  await fireEvent.press(screen.getAllByTestId("post-edit-run")[0]);

  onTheCanvas();
  expect(fetchSpy.mock.calls.length).toBe(before);
});

test("«Edit & run» on the page of a post closes the page and puts its line on the map", async () => {
  await onPage();
  const before = fetchSpy.mock.calls.length;

  await fireEvent.press(
    within(screen.getByTestId("post-page")).getByTestId("post-edit-run"),
  );

  expect(screen.queryByTestId("post-page")).toBeNull();
  onTheCanvas();
  expect(fetchSpy.mock.calls.length).toBe(before);
});

test("«‹» on the page of a post goes back to the Feed", async () => {
  await onPage();

  await fireEvent.press(screen.getByTestId("post-back"));

  expect(screen.queryByTestId("post-page")).toBeNull();
  expect(screen.getByText(String(feed.posts[0].title))).toBeOnTheScreen();
});

test("after «Edit & run», the route drawn has «Save» beside «Start»; «Save» keeps it", async () => {
  await onPage();
  await fireEvent.press(
    within(screen.getByTestId("post-page")).getByTestId("post-edit-run"),
  );
  onTheCanvas();

  await fireEvent.press(screen.getByText("Draw route"));
  await screen.findByText(/^Drawing · on roads · target/, {}, { timeout: 3000 });

  expect(screen.getByRole("button", { name: "Start" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("button", { name: "Saved" })).toBeSelected();
  expect(
    fetchSpy.mock.calls.some(
      ([input, init]) =>
        init?.method === "PUT" && String(input).startsWith(`${API}/me/favorites/`),
    ),
  ).toBe(true);
});
