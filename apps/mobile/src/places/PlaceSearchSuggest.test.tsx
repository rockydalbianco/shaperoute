/**
 * Places the search knows by itself (TASK-240): with «Paddle» the lakes
 * and the beaches, shown at once and above the ones found. Without
 * `suggest` the field is the one of PlaceSearch.test.tsx.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { SPOT_SEARCH_HINT, spotPlaces } from "../paddle/placeSpots";
import type { LatLon } from "@shaperoute/shared-types";

import { PlaceSearch, SUGGEST_DELAY_MS } from "./PlaceSearch";

const LEVICO_TERME: LatLon = [46.0122, 11.2986];
const HINT = SPOT_SEARCH_HINT;

/** Photon for «lago di Levico Terme», as the user saw it: streets. */
const streets = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [11.3012, 46.0101] },
      properties: { name: "Via al Lago", city: "Levico Terme" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [11.2831, 46.0085] },
      properties: { name: "Lago di Levico" },
    },
  ],
};

const fetchMock = jest.spyOn(globalThis, "fetch");

async function type(text: string, hint = HINT) {
  await fireEvent.changeText(screen.getByPlaceholderText(hint), text);
}

async function pause(ms = SUGGEST_DELAY_MS) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  fetchMock.mockRestore();
});

async function paddleSearch(onSelect = jest.fn()) {
  await render(
    <PlaceSearch
      onSelect={onSelect}
      near={LEVICO_TERME}
      suggest={spotPlaces}
      placeholder={HINT}
    />,
  );
  return onSelect;
}

test("the lake is offered at once, before any answer", async () => {
  fetchMock.mockReturnValue(new Promise(() => {}));
  await paddleSearch();
  await type("lago di Levico Terme");
  expect(screen.getByText("Lago di Levico")).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
  await pause();
  // The streets are still asked for, and the lake stays meanwhile.
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Lago di Levico")).toBeOnTheScreen();
  expect(screen.getByText("Searching…")).toBeOnTheScreen();
});

test("the lake is above the streets found, and shown once", async () => {
  fetchMock.mockResolvedValue(Response.json(streets));
  await paddleSearch();
  await type("lago di Levico Terme");
  await pause();
  expect(screen.getByText("Via al Lago, Levico Terme")).toBeOnTheScreen();
  expect(screen.getAllByText("Lago di Levico")).toHaveLength(1);
  const texts = screen.getAllByText(/Lago/).map((node) => String(node.props.children));
  expect(texts).toEqual(["Lago di Levico", "Via al Lago, Levico Terme"]);
});

test("choosing the lake gives its shore point and distance, and closes the list", async () => {
  fetchMock.mockResolvedValue(Response.json(streets));
  const onSelect = await paddleSearch();
  await type("lago di Levico Terme");
  await pause();
  await fireEvent.press(screen.getByText("Lago di Levico"));

  expect(onSelect).toHaveBeenCalledTimes(1);
  const [[chosen]] = onSelect.mock.calls;
  expect(chosen).toEqual(spotPlaces("Lago di Levico", LEVICO_TERME)[0]);
  expect(chosen.distance_m).toBe(2000);
  expect(screen.getByPlaceholderText(HINT).props.value).toBe("Lago di Levico");
  // Nothing is suggested for the name now in the field.
  await pause();
  expect(screen.queryByText("Lago di Levico")).not.toBeOnTheScreen();
  expect(screen.queryByText("Via al Lago, Levico Terme")).not.toBeOnTheScreen();
  // Typing again suggests again.
  await type("Lago di Levic");
  expect(screen.getByText("Lago di Levico")).toBeOnTheScreen();
});

test("a lake found is enough: «No place found» is not said over it", async () => {
  fetchMock.mockResolvedValue(
    Response.json({ type: "FeatureCollection", features: [] }),
  );
  await paddleSearch();
  await type("lago di Levico Terme");
  await pause();
  expect(screen.getByText("Lago di Levico")).toBeOnTheScreen();
  expect(
    screen.queryByText("No place found. Try adding the city."),
  ).not.toBeOnTheScreen();
});

test("the lake stays when the search fails", async () => {
  fetchMock.mockRejectedValue(new TypeError("Network request failed"));
  await paddleSearch();
  await type("lago di Levico Terme");
  await pause();
  expect(screen.getByText("Lago di Levico")).toBeOnTheScreen();
  expect(
    screen.getByText("The search failed. Check the connection and try again."),
  ).toBeOnTheScreen();
});

test("a street finds no lake: the list is the one of the other sports", async () => {
  fetchMock.mockResolvedValue(Response.json(streets));
  await paddleSearch();
  await type("via al lago");
  expect(screen.queryByText("Lago di Levico")).not.toBeOnTheScreen();
  await pause();
  expect(screen.getByText("Via al Lago, Levico Terme")).toBeOnTheScreen();
});

test("one or two letters offer no lake", async () => {
  await paddleSearch();
  await type("le");
  expect(screen.queryByText("Lago di Levico")).not.toBeOnTheScreen();
  await type("lev");
  expect(screen.getByText("Lago di Levico")).toBeOnTheScreen();
  await type("le");
  expect(screen.queryByText("Lago di Levico")).not.toBeOnTheScreen();
});

test("without `suggest`, as with «Run» and «Bike», no lake is offered", async () => {
  fetchMock.mockResolvedValue(Response.json(streets));
  await render(<PlaceSearch onSelect={jest.fn()} near={LEVICO_TERME} />);
  await type("lago di Levico Terme", "City or street");
  expect(screen.queryByText("Lago di Levico")).not.toBeOnTheScreen();
  await pause();
  // Photon's own, in Photon's order.
  const texts = screen.getAllByText(/Lago/).map((node) => String(node.props.children));
  expect(texts).toEqual(["Via al Lago, Levico Terme", "Lago di Levico"]);
});
