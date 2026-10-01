import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Place } from "../places/photon";
import { AskForRoute, QUICK_CATEGORIES } from "./AskForRoute";
import { CATEGORIES } from "./presets";

const newYork: Place = { label: "New York, United States", point: [40.7127, -74.006] };
const paris: Place = { label: "Paris, Ile-de-France, France", point: [48.85, 2.35] };
const arena: Place = {
  label: "Verona Arena, Verona, Italy",
  point: [45.439, 10.9949],
  kind: "place",
};

test("two categories, Food first, the others behind More… (TASK-143)", async () => {
  const onAsk = jest.fn();
  await render(<AskForRoute city={newYork} where={newYork.label} onAsk={onAsk} />);
  expect(QUICK_CATEGORIES).toBe(2);
  expect(screen.getByText("Food")).toBeOnTheScreen();
  expect(screen.getByText("Famous Places")).toBeOnTheScreen();
  expect(screen.queryByText("Hidden Gems")).toBeNull();
  expect(screen.getByText(`${CATEGORIES.length - 2} more`)).toBeOnTheScreen();

  await fireEvent.press(screen.getByLabelText("More categories"));
  for (const category of CATEGORIES) {
    expect(screen.getByText(category)).toBeOnTheScreen();
  }
  expect(screen.queryByText("More…")).toBeNull();
  await fireEvent.press(screen.getByText("Hidden Gems"));
  expect(onAsk).toHaveBeenLastCalledWith("Hidden Gems in New York");
});

test("a category is one tap, for the city or near the start", async () => {
  const onAsk = jest.fn();
  await render(<AskForRoute city={newYork} where={newYork.label} onAsk={onAsk} />);
  await fireEvent.press(screen.getByText("Food"));
  expect(onAsk).toHaveBeenCalledWith("Food in New York");
  expect(screen.getAllByText("in New York").length).toBe(QUICK_CATEGORIES);

  await render(<AskForRoute where="your start" onAsk={onAsk} />);
  await fireEvent.press(screen.getByText("Famous Places"));
  expect(onAsk).toHaveBeenLastCalledWith("Famous Places");
});

test("from a place, the categories go by its point, not its name", async () => {
  const onAsk = jest.fn();
  await render(<AskForRoute city={arena} where={arena.label} onAsk={onAsk} />);
  expect(screen.getAllByText("near Verona Arena").length).toBe(QUICK_CATEGORIES);
  await fireEvent.press(screen.getByText("Food"));
  expect(onAsk).toHaveBeenCalledWith("Food");
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
