import { fireEvent, render, screen } from "@testing-library/react-native";

import response from "./fixtures/photon-via-belenzani-trento.json";
import { PlaceSearch } from "./PlaceSearch";

const fetchMock = jest.spyOn(globalThis, "fetch");

function photonAnswers(body: unknown) {
  fetchMock.mockResolvedValue(Response.json(body));
}

async function searchFor(text: string) {
  await fireEvent.changeText(screen.getByPlaceholderText("City or street"), text);
  await fireEvent.press(screen.getByText("Search"));
}

beforeEach(() => {
  fetchMock.mockReset();
});

afterAll(() => {
  fetchMock.mockRestore();
});

test("an empty field sends no request", async () => {
  await render(<PlaceSearch onSelect={jest.fn()} />);
  await searchFor("   ");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("shows the places found and gives back the one chosen", async () => {
  photonAnswers(response);
  const onSelect = jest.fn();
  await render(<PlaceSearch onSelect={onSelect} />);
  await searchFor("Via Belenzani, Trento");

  expect(await screen.findByText("Comune di Trento, Trento")).toBeOnTheScreen();
  expect(screen.getByText("© OpenStreetMap contributors")).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Via Rodolfo Belenzani, Trento"));

  expect(onSelect).toHaveBeenCalledWith({
    label: "Via Rodolfo Belenzani, Trento",
    point: [46.0692621, 11.1211947],
  });
  expect(screen.queryByText("Comune di Trento, Trento")).not.toBeOnTheScreen();
});

test("says so when nothing is found", async () => {
  photonAnswers({ type: "FeatureCollection", features: [] });
  await render(<PlaceSearch onSelect={jest.fn()} />);
  await searchFor("Xyzzy");
  expect(
    await screen.findByText("No place found. Try adding the city."),
  ).toBeOnTheScreen();
});

test("says so when the search fails", async () => {
  fetchMock.mockRejectedValue(new TypeError("Network request failed"));
  await render(<PlaceSearch onSelect={jest.fn()} />);
  await searchFor("Trento");
  expect(
    await screen.findByText("The search failed. Check the connection and try again."),
  ).toBeOnTheScreen();
});
