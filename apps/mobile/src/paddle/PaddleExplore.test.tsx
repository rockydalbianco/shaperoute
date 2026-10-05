import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { forgetExamples } from "../explore/exampleRoutes";
import { forgetWaterChoice, PaddleExplore } from "./PaddleExplore";
import { WATER_PLACES } from "./waterPlaces";
import { WATER_SPOTS } from "./waterSpots";

jest.mock("react-native-webview");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");

const API = "http://api";
// The user's own case (TASK-233): the lake of Levico is 1 km away.
const LEVICO_TERME: [number, number] = [46.0122, 11.2986];
// In the middle of the Ionian Sea: no spot of the list is near.
const AT_SEA: [number, number] = [36.0, 18.5];
const SHAPES = [
  "Heart",
  "Circle",
  "Star",
  "Moon",
  "Horse",
  "Snail",
  "Dog head",
  "Rabbit head",
];

let fetchSpy: jest.SpiedFunction<typeof fetch>;

/** The API accepts each route job and has it done at the first poll. */
function apiDraws() {
  fetchSpy.mockImplementation(async (_input, init) =>
    (init?.method ?? "GET") === "POST"
      ? Response.json(
          { job_id: "4f2c9e1a", status: "queued", result: null, error: null },
          { status: 202 },
        )
      : Response.json(jobDone),
  );
}

/** The bodies sent to POST /route-jobs, read back. */
function asked(): unknown[] {
  return fetchSpy.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .map(([, init]) => JSON.parse(String(init?.body)));
}

async function settle() {
  // Each example: the job, then its first poll after 500 ms; eight of them.
  for (let i = 0; i < 10; i += 1) {
    await act(() => jest.advanceTimersByTimeAsync(500));
  }
}

beforeEach(() => {
  jest.useFakeTimers();
  forgetExamples();
  forgetWaterChoice();
  fetchSpy = jest.spyOn(globalThis, "fetch");
});

afterEach(() => {
  forgetExamples();
  fetchSpy.mockRestore();
  jest.useRealTimers();
});

test("with a start, «Near me» is on at once and shows the nearest lake", async () => {
  apiDraws();
  await render(<PaddleExplore apiUrl={API} near={LEVICO_TERME} onOpen={jest.fn()} />);
  expect(screen.getByText("On the water")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Near me" })).toBeSelected();
  expect(screen.getByText(/^LAGO DI LEVICO · \d\.\d KM AWAY$/)).toBeOnTheScreen();
  // Its lake is under «Near me»; the next ones are there to tap.
  expect(screen.queryByRole("button", { name: "Lago di Levico" })).toBeNull();
  expect(screen.getByRole("button", { name: "Lago di Caldonazzo" })).toBeOnTheScreen();
  await settle();
  // The eight of the run, from the lake's point of the list, not the start.
  const levico = WATER_SPOTS.find((spot) => spot.name === "Lago di Levico");
  expect(asked()).toHaveLength(8);
  expect(asked()[0]).toMatchObject({
    start: levico?.point,
    activity: "paddling",
    distance_m: 2000,
  });
});

test("without a start, the places chosen by hand; nothing is asked until one is chosen", async () => {
  apiDraws();
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />);
  const names = ["Near me", "Lago di Garda", "Lago di Como", "Jesolo", "Riccione"];
  for (const name of names) {
    expect(screen.getByRole("button", { name })).toBeOnTheScreen();
  }
  expect(WATER_PLACES.map((place) => place.name)).toEqual(names.slice(1));
  expect(screen.getByRole("button", { name: "Near me" })).not.toBeSelected();
  expect(
    screen.getByText(
      "Choose a lake or a beach: eight shapes on its water, from the shore.",
    ),
  ).toBeOnTheScreen();
  // No city, no run of the catalogue.
  expect(screen.queryByText("Milan")).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("a place chosen by hand has the eight shapes of the run, come with the app", async () => {
  apiDraws();
  const onOpen = jest.fn();
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={onOpen} />);
  await fireEvent.press(screen.getByRole("button", { name: "Lago di Garda" }));
  expect(screen.getByRole("button", { name: "Lago di Garda" })).toBeSelected();
  expect(screen.getByText("LAGO DI GARDA · FROM RIVA DEL GARDA")).toBeOnTheScreen();
  // Ready at once: nothing is asked of the API (TASK-227).
  for (const name of SHAPES) {
    expect(screen.getByLabelText(`${name}, 2.0 km, on the water`)).toBeOnTheScreen();
  }
  await settle();
  expect(asked()).toEqual([]);
  await fireEvent.press(screen.getByLabelText("Heart, 2.0 km, on the water"));
  expect(onOpen).toHaveBeenCalledWith(
    expect.objectContaining({
      shape: "heart",
      city: "Lago di Garda",
      distance_m: 2000,
    }),
  );
});

test("a lake is found by typing its name, and chosen with a tap", async () => {
  apiDraws();
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />);
  const field = screen.getByPlaceholderText("Type a lake or a beach");
  // One letter is not a search.
  await fireEvent.changeText(field, "l");
  expect(screen.queryByRole("button", { name: "Lago di Levico" })).toBeNull();
  await fireEvent.changeText(field, "lev");
  await fireEvent.press(screen.getByRole("button", { name: "Lago di Levico" }));
  // Chosen: the field is empty again, and the lake is the first to tap.
  expect(field.props.value).toBe("");
  expect(screen.getByRole("button", { name: "Lago di Levico" })).toBeSelected();
  expect(screen.getByText("LAGO DI LEVICO")).toBeOnTheScreen();
  await settle();
  expect(asked()).toHaveLength(8);
  expect(asked()[0]).toMatchObject({ activity: "paddling", distance_m: 2000 });
});

test("a name no lake has says so", async () => {
  apiDraws();
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />);
  await fireEvent.changeText(
    screen.getByPlaceholderText("Type a lake or a beach"),
    "zzz",
  );
  expect(screen.getByText("No lake or beach matches “zzz”.")).toBeOnTheScreen();
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("a small lake has its shapes at its own distance, less than 2 km", async () => {
  apiDraws();
  const small = WATER_SPOTS.find((spot) => spot.distance_m === 1000);
  expect(small).toBeDefined();
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />);
  await fireEvent.changeText(
    screen.getByPlaceholderText("Type a lake or a beach"),
    small?.name ?? "",
  );
  await fireEvent.press(screen.getByRole("button", { name: small?.name }));
  await settle();
  expect(asked()[0]).toMatchObject({
    start: small?.point,
    activity: "paddling",
    distance_m: 1000,
  });
});

test("far from every lake, «Near me» draws from the start of «Draw», as it first was", async () => {
  apiDraws();
  const { rerender } = await render(
    <PaddleExplore apiUrl={API} near={AT_SEA} onOpen={jest.fn()} />,
  );
  expect(screen.getByRole("button", { name: "Near me" })).toBeSelected();
  expect(screen.getByText("NEAR YOUR START")).toBeOnTheScreen();
  await settle();
  // The position moves a little: the shapes are not drawn again.
  await rerender(
    <PaddleExplore apiUrl={API} near={[36.0001, 18.5001]} onOpen={jest.fn()} />,
  );
  await settle();
  // The eight of the run, one after the other.
  expect(asked()).toHaveLength(8);
  expect(asked()[0]).toMatchObject({
    start: AT_SEA,
    activity: "paddling",
    distance_m: 2000,
  });
});

test("a start that comes after the page turns «Near me» on", async () => {
  apiDraws();
  const { rerender } = await render(
    <PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />,
  );
  expect(screen.getByRole("button", { name: "Near me" })).not.toBeSelected();
  await rerender(<PaddleExplore apiUrl={API} near={LEVICO_TERME} onOpen={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Near me" })).toBeSelected();
  expect(screen.getByText(/^LAGO DI LEVICO · /)).toBeOnTheScreen();
  await settle();
});

test("«Near me» without a start asks for one first", async () => {
  apiDraws();
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />);
  await fireEvent.press(screen.getByRole("button", { name: "Near me" }));
  expect(
    screen.getByText(
      "Choose a start in Draw first: the shapes start from the shore nearest to it.",
    ),
  ).toBeOnTheScreen();
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("water the API cannot download says so, with Try again", async () => {
  fetchSpy.mockImplementation(async () =>
    Response.json(
      {
        error: {
          code: "map_data_unavailable",
          message: "Overpass refused the request",
        },
      },
      { status: 503 },
    ),
  );
  // A place chosen by hand comes with the app: the others ask the API.
  await render(<PaddleExplore apiUrl={API} near={AT_SEA} onOpen={jest.fn()} />);
  await settle();
  expect(
    screen.getByText(
      "Map data for this area could not be downloaded. Try again later.",
    ),
  ).toBeOnTheScreen();
  // The first three say so; the others are left out, as in a city.
  expect(screen.getAllByText("Not drawn")).toHaveLength(3);
  expect(screen.getByRole("button", { name: "Try again" })).toBeOnTheScreen();
});

test("the place chosen is still chosen when the page comes back", async () => {
  apiDraws();
  const first = await render(
    <PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Jesolo" }));
  await settle();
  await first.unmount();
  await render(<PaddleExplore apiUrl={API} near={LEVICO_TERME} onOpen={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Jesolo" })).toBeSelected();
  expect(screen.getByRole("button", { name: "Near me" })).not.toBeSelected();
  expect(screen.getByLabelText("Heart, 2.0 km, on the water")).toBeOnTheScreen();
});
