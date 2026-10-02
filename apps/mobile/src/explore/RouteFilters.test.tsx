import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";

import { ALL, optionLabel, RouteFilters } from "./RouteFilters";

/** The two filters of «Best near you», holding their own choices. */
function Filters({ onShape = () => {} }: { onShape?: (value: string) => void }) {
  const [shape, setShape] = useState(ALL);
  const [km, setKm] = useState(ALL);
  return (
    <RouteFilters
      filters={[
        {
          name: "Shape",
          options: [ALL, "star", "heart", "CIAO"],
          value: shape,
          onChange: (value) => {
            setShape(value);
            onShape(value);
          },
        },
        {
          name: "Distance",
          options: [ALL, "5 km", "10 km"],
          value: km,
          onChange: setKm,
        },
      ]}
    />
  );
}

test("a choice is written as it is read", () => {
  expect(optionLabel(ALL)).toBe("All");
  expect(optionLabel("heart")).toBe("Heart");
  expect(optionLabel("5 km")).toBe("5 km");
});

test("one row, a button for each filter, saying what it keeps", async () => {
  await render(<Filters />);
  expect(screen.getByRole("button", { name: "Shape: All" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Distance: All" })).toBeOnTheScreen();
  expect(screen.getByText("Shape: All ▾")).toBeOnTheScreen();
  // The choices are not there until a filter is touched.
  expect(screen.queryByText("Heart")).toBeNull();
  expect(screen.queryByText("5 km")).toBeNull();
});

test("a touch opens the choices of that filter, a choice closes them", async () => {
  const onShape = jest.fn();
  await render(<Filters onShape={onShape} />);
  await fireEvent.press(screen.getByRole("button", { name: "Shape: All" }));
  expect(
    screen.getByRole("button", { name: "Shape: All", expanded: true }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "All", selected: true })).toBeOnTheScreen();
  expect(screen.getByText("Star")).toBeOnTheScreen();
  expect(screen.getByText("CIAO")).toBeOnTheScreen();
  expect(screen.queryByText("5 km")).toBeNull();

  await fireEvent.press(screen.getByText("Heart"));
  expect(onShape).toHaveBeenCalledWith("heart");
  // Closed again, and the button says what it keeps now.
  expect(
    screen.getByRole("button", { name: "Shape: Heart", expanded: false }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Star")).toBeNull();
});

test("one filter is open at a time, and touching it again closes it", async () => {
  await render(<Filters />);
  await fireEvent.press(screen.getByRole("button", { name: "Shape: All" }));
  await fireEvent.press(screen.getByRole("button", { name: "Distance: All" }));
  expect(screen.getByText("10 km")).toBeOnTheScreen();
  expect(screen.queryByText("Star")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Distance: All" }));
  expect(screen.queryByText("10 km")).toBeNull();
});

test("a filter goes back to all from its own choices", async () => {
  await render(<Filters />);
  await fireEvent.press(screen.getByRole("button", { name: "Distance: All" }));
  await fireEvent.press(screen.getByText("5 km"));
  expect(screen.getByRole("button", { name: "Distance: 5 km" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Distance: 5 km" }));
  expect(
    screen.getByRole("button", { name: "5 km", selected: true }),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "All" }));
  expect(screen.getByRole("button", { name: "Distance: All" })).toBeOnTheScreen();
});
