import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { forgetExamples } from "../explore/exampleRoutes";
import { forgetWaterChoice, PaddleExplore } from "./PaddleExplore";
import { WATER_PLACES } from "./waterPlaces";

jest.mock("react-native-webview");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");

const API = "http://api";
const TRENTO: [number, number] = [46.0671, 11.1214];

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
  // Each example: the job, then its first poll after 500 ms.
  for (let i = 0; i < 6; i += 1) {
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

test("the user's places, «Near me» first; nothing is asked until one is chosen", async () => {
  apiDraws();
  await render(<PaddleExplore apiUrl={API} near={TRENTO} onOpen={jest.fn()} />);
  expect(screen.getByText("On the water")).toBeOnTheScreen();
  const names = ["Near me", "Lago di Garda", "Lago di Como", "Jesolo", "Riccione"];
  for (const name of names) {
    expect(screen.getByRole("button", { name })).toBeOnTheScreen();
  }
  expect(WATER_PLACES.map((place) => place.name)).toEqual(names.slice(1));
  expect(
    screen.getByText(
      "Choose a lake or a beach: eight shapes of 2 km on its water, from the shore.",
    ),
  ).toBeOnTheScreen();
  // No city, no run of the catalogue.
  expect(screen.queryByText("Milan")).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("a place chosen has the eight shapes of the run, come with the app", async () => {
  apiDraws();
  const onOpen = jest.fn();
  await render(<PaddleExplore apiUrl={API} near={TRENTO} onOpen={onOpen} />);
  await fireEvent.press(screen.getByRole("button", { name: "Lago di Garda" }));
  expect(screen.getByRole("button", { name: "Lago di Garda" })).toBeSelected();
  expect(screen.getByText("LAGO DI GARDA · FROM RIVA DEL GARDA")).toBeOnTheScreen();
  // Ready at once: nothing is asked of the API (TASK-227).
  const names = [
    "Heart",
    "Circle",
    "Star",
    "Moon",
    "Horse",
    "Snail",
    "Dog head",
    "Rabbit head",
  ];
  for (const name of names) {
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

test("«Near me» draws from the start of «Draw», as it was when tapped", async () => {
  apiDraws();
  const { rerender } = await render(
    <PaddleExplore apiUrl={API} near={TRENTO} onOpen={jest.fn()} />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Near me" }));
  expect(screen.getByText("NEAR YOUR START")).toBeOnTheScreen();
  await settle();
  // The position moves a little: the shapes are not drawn again.
  await rerender(
    <PaddleExplore apiUrl={API} near={[46.0672, 11.1215]} onOpen={jest.fn()} />,
  );
  await settle();
  // The eight of the run, one after the other.
  expect(asked()).toHaveLength(8);
  expect(asked()[0]).toMatchObject({ start: TRENTO, activity: "paddling" });
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
  await render(<PaddleExplore apiUrl={API} near={TRENTO} onOpen={jest.fn()} />);
  // A place of «Explore» comes with the app: «Near me» asks the API.
  await fireEvent.press(screen.getByRole("button", { name: "Near me" }));
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
    <PaddleExplore apiUrl={API} near={TRENTO} onOpen={jest.fn()} />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Jesolo" }));
  await settle();
  await first.unmount();
  await render(<PaddleExplore apiUrl={API} near={TRENTO} onOpen={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Jesolo" })).toBeSelected();
  expect(screen.getByLabelText("Heart, 2.0 km, on the water")).toBeOnTheScreen();
});
