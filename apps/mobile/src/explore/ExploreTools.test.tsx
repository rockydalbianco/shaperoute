import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { Place } from "../places/photon";
import { AskForRoute, CityPicker } from "./ExploreTools";
import { CATEGORIES } from "./presets";

const newYork: Place = { label: "New York, United States", point: [40.7127, -74.006] };
const paris: Place = {
  label: "Paris, Ile-de-France, France",
  point: [48.8535, 2.3484],
};
const parma: Place = { label: "Parma, Emilia-Romagna, Italy", point: [44.802, 10.328] };

function answers(places: Place[]) {
  return jest.fn().mockResolvedValue(Response.json({ places }));
}

test("a featured city is one tap: its centre comes from the API", async () => {
  const fetchFn = answers([newYork]);
  const onCity = jest.fn();
  await render(
    <CityPicker apiUrl="http://api" city={null} onCity={onCity} fetchFn={fetchFn} />,
  );
  await fireEvent.press(screen.getByText("New York"));
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/cities?q=New%20York");
  expect(onCity).toHaveBeenCalledWith(newYork);
});

test("cities from around the world, and the recent ones first", async () => {
  await render(
    <CityPicker apiUrl="http://api" city={null} onCity={jest.fn()} recent={[parma]} />,
  );
  for (const name of ["London", "Tokyo", "Dubai", "Torino", "Barcelona"]) {
    expect(screen.getByText(name)).toBeOnTheScreen();
  }
  expect(screen.getByText("↺ Parma")).toBeOnTheScreen();
});

test("typing suggests cities, and a tap chooses one", async () => {
  jest.useFakeTimers();
  const fetchFn = answers([parma, paris]);
  const onCity = jest.fn();
  await render(
    <CityPicker
      apiUrl="http://api"
      city={null}
      onCity={onCity}
      fetchFn={fetchFn}
      suggestDelayMs={10}
    />,
  );
  await fireEvent.changeText(screen.getByPlaceholderText("Type a city"), "Par");
  await act(async () => {
    jest.advanceTimersByTime(20);
  });
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/city-suggestions?q=Par");
  await fireEvent.press(await screen.findByText(paris.label));
  expect(onCity).toHaveBeenCalledWith(paris);
  jest.useRealTimers();
});

test("one letter asks nothing", async () => {
  jest.useFakeTimers();
  const fetchFn = answers([paris]);
  await render(
    <CityPicker
      apiUrl="http://api"
      city={null}
      onCity={jest.fn()}
      fetchFn={fetchFn}
      suggestDelayMs={10}
    />,
  );
  await fireEvent.changeText(screen.getByPlaceholderText("Type a city"), "P");
  await act(async () => {
    jest.advanceTimersByTime(50);
  });
  expect(fetchFn).not.toHaveBeenCalled();
  jest.useRealTimers();
});

test("a chosen city shows, and goes back to the start", async () => {
  const onCity = jest.fn();
  await render(<CityPicker apiUrl="http://api" city={newYork} onCity={onCity} />);
  expect(screen.getByText(newYork.label)).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("My start"));
  expect(onCity).toHaveBeenCalledWith(null);
});

test("a city search that fails says so", async () => {
  const fetchFn = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
  await render(
    <CityPicker apiUrl="http://api" city={null} onCity={jest.fn()} fetchFn={fetchFn} />,
  );
  await fireEvent.press(screen.getByText("Tokyo"));
  expect(await screen.findByText(/did not answer/)).toBeOnTheScreen();
});

test("a category is one tap, for the chosen city; Food first", async () => {
  const onAsk = jest.fn();
  await render(<AskForRoute city={newYork} where={newYork.label} onAsk={onAsk} />);
  expect(CATEGORIES[0]).toBe("Food");
  await fireEvent.press(screen.getByText("Food"));
  expect(onAsk).toHaveBeenCalledWith("Food in New York");
  await fireEvent.press(screen.getByText("Hidden Gems"));
  expect(onAsk).toHaveBeenLastCalledWith("Hidden Gems in New York");
  expect(screen.getAllByText("in New York").length).toBe(CATEGORIES.length);
});

test("without a city the categories are near the start", async () => {
  const onAsk = jest.fn();
  await render(<AskForRoute where="your start" onAsk={onAsk} />);
  await fireEvent.press(screen.getByText("Romantic"));
  expect(onAsk).toHaveBeenCalledWith("Romantic");
});

test("a request in words still works, with an example for the city", async () => {
  const onAsk = jest.fn();
  await render(<AskForRoute city={paris} where={paris.label} onAsk={onAsk} />);
  await fireEvent.press(screen.getByText("Make my route"));
  expect(onAsk).not.toHaveBeenCalled();
  const field = screen.getByPlaceholderText("e.g. a romantic heart in Paris, 8 km");
  await fireEvent.changeText(field, " a romantic heart ");
  await fireEvent.press(screen.getByText("Make my route"));
  expect(onAsk).toHaveBeenCalledWith("a romantic heart");
});
