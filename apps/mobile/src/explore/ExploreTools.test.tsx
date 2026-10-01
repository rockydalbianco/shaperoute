import places from "@shaperoute/shared-types/fixtures/places.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Place } from "../places/photon";
import { AskForRoute, CityPicker } from "./ExploreTools";

const trento = places.places[0] as Place;

test("searches a city and gives back the one chosen", async () => {
  const fetchFn = jest.fn().mockResolvedValue(Response.json(places));
  const onCity = jest.fn();
  await render(
    <CityPicker apiUrl="http://api" city={null} onCity={onCity} fetchFn={fetchFn} />,
  );
  await fireEvent.changeText(screen.getByPlaceholderText("Search a city"), "Trento");
  await fireEvent.press(screen.getByText("Search"));
  await fireEvent.press(await screen.findByText(places.places[1].label));
  expect(onCity).toHaveBeenCalledWith(places.places[1]);
});

test("a chosen city can be changed", async () => {
  const onCity = jest.fn();
  await render(<CityPicker apiUrl="http://api" city={trento} onCity={onCity} />);
  expect(screen.getByText(trento.label)).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Change"));
  expect(onCity).toHaveBeenCalledWith(null);
});

test("asks for a route only with words", async () => {
  const onAsk = jest.fn();
  await render(<AskForRoute where="Turin" onAsk={onAsk} />);
  await fireEvent.press(screen.getByText("Make my route"));
  expect(onAsk).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByPlaceholderText(/a romantic heart/),
    " a romantic heart ",
  );
  await fireEvent.press(screen.getByText("Make my route"));
  expect(onAsk).toHaveBeenCalledWith("a romantic heart");
  expect(screen.getByText(/from Turin/)).toBeOnTheScreen();
});
