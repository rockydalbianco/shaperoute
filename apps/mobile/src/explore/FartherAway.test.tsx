import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import type { FarRow } from "./catalogList";
import { FarCityLabel, FarFooter, FarHeader, FarRowView } from "./FartherAway";
import type { RecommendedRoute } from "./recommendedRoutes";

// The rows of «Farther away» (TASK-420).

function route(id: string, city: string): RecommendedRoute {
  return {
    id,
    city,
    shape: "star",
    word: null,
    style: null,
    distance_m: 5000,
    route_m: 5100,
    similarity: 0.9,
    start: [46.067, 11.1215],
    away_m: 22_000,
    preview: [
      [46.067, 11.1215],
      [46.068, 11.1225],
    ],
  };
}

test("the label of the section counts the drawings beyond «Near you»", async () => {
  await render(<FarHeader count={151} />);
  expect(screen.getByText("FARTHER AWAY")).toBeOnTheScreen();
  expect(screen.getByText("151 drawings · by city")).toBeOnTheScreen();
  await render(<FarHeader count={1} />);
  expect(screen.getByText("1 drawing · by city")).toBeOnTheScreen();
});

test("a city's label: its name, how far, how many; in miles too", async () => {
  await render(<FarCityLabel city="rovereto" awayM={22_000} count={8} units="km" />);
  expect(screen.getByRole("header")).toHaveTextContent("ROVERETO");
  expect(screen.getByText("22 km · 8")).toBeOnTheScreen();
  await render(<FarCityLabel city="newyork" awayM={6_500_000} count={18} units="mi" />);
  expect(screen.getByText("NEW YORK")).toBeOnTheScreen();
  expect(screen.getByText(/mi · 18$/)).toBeOnTheScreen();
});

test("a row is a city's label or two cards drawn by the page", async () => {
  const pair: FarRow = {
    kind: "pair",
    key: "p",
    routes: [route("a", "milano"), route("b", "milano")],
  };
  const cityRow: FarRow = {
    kind: "city",
    key: "c",
    city: "milano",
    away_m: 190_000,
    count: 2,
  };
  await render(
    <>
      <FarRowView
        row={cityRow}
        units="km"
        card={(r) => <Text key={r.id}>{r.id}</Text>}
      />
      <FarRowView
        row={pair}
        units="km"
        card={(r) => <Text key={r.id}>card {r.id}</Text>}
      />
    </>,
  );
  expect(screen.getByText("MILANO")).toBeOnTheScreen();
  expect(screen.getByText("190 km · 2")).toBeOnTheScreen();
  expect(screen.getByText("card a")).toBeOnTheScreen();
  expect(screen.getByText("card b")).toBeOnTheScreen();
});

test("the foot: more on the way, a failure with a way to try again, or nothing", async () => {
  const onRetry = jest.fn();
  const view = await render(
    <FarFooter status="loading" more={false} onRetry={onRetry} />,
  );
  expect(screen.getByText("Loading more…")).toBeOnTheScreen();
  await view.rerender(<FarFooter status="ready" more onRetry={onRetry} />);
  expect(screen.getByText("Loading more…")).toBeOnTheScreen();
  await view.rerender(<FarFooter status="failed" more={false} onRetry={onRetry} />);
  expect(screen.getByText("The rest could not load.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button"));
  expect(onRetry).toHaveBeenCalled();
  await view.rerender(<FarFooter status="ready" more={false} onRetry={onRetry} />);
  expect(screen.queryByText("Loading more…")).toBeNull();
  expect(screen.queryByText("The rest could not load.")).toBeNull();
  await view.rerender(<FarFooter status="none" more={false} onRetry={onRetry} />);
  expect(screen.toJSON()).toBeNull();
});
