import type { LatLon } from "@shaperoute/shared-types";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

import { files } from "../engine/memoryFiles";
import { forgetExamples } from "../explore/exampleRoutes";
import { HOME_AREA_FILE, type HomeArea } from "./homeArea";
import { forgetWaterChoice, PaddleExplore } from "./PaddleExplore";
import { WATER_FILTER_FILE } from "./waterKinds";
import { byName, kindOf, SPOTS_SHOWN, WATER_SPOTS } from "./waterSpots";

jest.mock("react-native-webview");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system", () => jest.requireActual("../engine/memoryFiles"));

const API = "http://api";
const LEVICO_TERME: LatLon = [46.0122, 11.2986];
// Como's lakefront: far from Levico, a trip.
const COMO: LatLon = [45.8132, 9.08029];

let fetchSpy: jest.SpiedFunction<typeof fetch>;

function homeAt(home: HomeArea) {
  files.set(`file:///documents/${HOME_AREA_FILE}`, JSON.stringify(home));
}

/** The names of the places to tap, in their order. */
function placeChips(): string[] {
  return screen
    .getAllByRole("button")
    .map((button) =>
      within(button)
        .queryAllByText(/.+/)
        .map((text) => String(text.props.children))
        .join(""),
    )
    .filter((name) => WATER_SPOTS.some((spot) => spot.name === name));
}

/** The names nearest `from` of a kind, as the page offers them. */
function nearest(from: LatLon, keep: (name: string) => boolean = () => true) {
  return byName(WATER_SPOTS, from)
    .map(({ spot }) => spot)
    .filter((spot) => keep(spot.name));
}

beforeEach(() => {
  jest.useFakeTimers();
  files.clear();
  forgetExamples();
  forgetWaterChoice();
  fetchSpy = jest.spyOn(globalThis, "fetch");
  fetchSpy.mockImplementation(async (_input, init) =>
    (init?.method ?? "GET") === "POST"
      ? Response.json(
          { job_id: "4f2c9e1a", status: "queued", result: null, error: null },
          { status: 202 },
        )
      : Response.json(jobDone),
  );
});

afterEach(async () => {
  for (let i = 0; i < 10; i += 1) {
    await act(() => jest.advanceTimersByTimeAsync(500));
  }
  forgetExamples();
  fetchSpy.mockRestore();
  jest.useRealTimers();
});

test("with a home area, the places nearest it are suggested, and nothing is asked", async () => {
  homeAt({ point: LEVICO_TERME, place: "Levico Terme" });
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />);
  const expected = nearest(LEVICO_TERME)
    .slice(0, SPOTS_SHOWN)
    .map((spot) => spot.name);
  expect(placeChips()).toEqual(expected);
  expect(expected).toContain("Lago di Levico");
  expect(screen.getByText("Suggested near Levico Terme")).toBeOnTheScreen();
  // Worked out on the phone: no request, no new call.
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("on a trip «Near me» is where one is, the suggestions near home", async () => {
  homeAt({ point: LEVICO_TERME, place: "Levico Terme" });
  await render(<PaddleExplore apiUrl={API} near={COMO} onOpen={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Near me" })).toBeSelected();
  expect(screen.getByText(/^LAGO DI COMO · /)).toBeOnTheScreen();
  expect(placeChips()[0]).toBe(nearest(LEVICO_TERME)[0].name);
  expect(screen.getByText("Suggested near Levico Terme")).toBeOnTheScreen();
});

test("a home area without a town says so in other words", async () => {
  homeAt({ point: LEVICO_TERME, place: null });
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />);
  expect(screen.getByText("Suggested near where you usually start")).toBeOnTheScreen();
});

test("without a home area, the start of «Near me»; without either, the places by hand", async () => {
  const first = await render(
    <PaddleExplore apiUrl={API} near={LEVICO_TERME} onOpen={jest.fn()} />,
  );
  expect(screen.getByText("Suggested near your start")).toBeOnTheScreen();
  await first.unmount();
  forgetWaterChoice();
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />);
  expect(placeChips()).toEqual(["Lago di Garda", "Lago di Como", "Jesolo", "Riccione"]);
  expect(screen.queryByText(/^Suggested near/)).toBeNull();
});

test("«Sea» shows the sea alone, «Lakes» the lakes, and a second tap both", async () => {
  homeAt({ point: LEVICO_TERME, place: "Levico Terme" });
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />);
  const lakes = screen.getByRole("button", { name: "Lakes" });
  const sea = screen.getByRole("button", { name: "Sea" });
  expect(lakes).toBeSelected();
  expect(sea).toBeSelected();
  const isSea = (name: string) =>
    WATER_SPOTS.some((s) => s.name === name && kindOf(s) === "sea");

  await fireEvent.press(sea);
  expect(screen.getByRole("button", { name: "Sea" })).toBeSelected();
  expect(screen.getByRole("button", { name: "Lakes" })).not.toBeSelected();
  expect(placeChips()).toEqual(
    nearest(LEVICO_TERME, isSea)
      .slice(0, SPOTS_SHOWN)
      .map((spot) => spot.name),
  );
  expect(placeChips().every(isSea)).toBe(true);

  await fireEvent.press(screen.getByRole("button", { name: "Lakes" }));
  expect(placeChips().some(isSea)).toBe(false);
  expect(placeChips()).toHaveLength(SPOTS_SHOWN);

  await fireEvent.press(screen.getByRole("button", { name: "Lakes" }));
  expect(screen.getByRole("button", { name: "Sea" })).toBeSelected();
  expect(screen.getByRole("button", { name: "Lakes" })).toBeSelected();
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("the filter is remembered on the phone", async () => {
  const first = await render(
    <PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Sea" }));
  // Without a start: the places by hand, of the sea alone.
  expect(placeChips()).toEqual(["Jesolo", "Riccione"]);
  expect(files.get(`file:///documents/${WATER_FILTER_FILE}`)).toBe('{"filter":"sea"}');
  await first.unmount();
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Lakes" })).not.toBeSelected();
  expect(placeChips()).toEqual(["Jesolo", "Riccione"]);
});

test("«Show more» adds the next places, nearest first", async () => {
  homeAt({ point: LEVICO_TERME, place: "Levico Terme" });
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />);
  expect(placeChips()).toHaveLength(SPOTS_SHOWN);
  await fireEvent.press(screen.getByRole("button", { name: "Show more" }));
  expect(placeChips()).toEqual(
    nearest(LEVICO_TERME)
      .slice(0, 2 * SPOTS_SHOWN)
      .map((spot) => spot.name),
  );
  // A filter starts the list again from the nearest.
  await fireEvent.press(screen.getByRole("button", { name: "Lakes" }));
  expect(placeChips()).toHaveLength(SPOTS_SHOWN);
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("without more places there is no «Show more»", async () => {
  await render(<PaddleExplore apiUrl={API} near={null} onOpen={jest.fn()} />);
  expect(placeChips()).toHaveLength(4);
  expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
});
