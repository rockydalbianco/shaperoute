import type { Direction } from "@shaperoute/shared-types";
import result from "@shaperoute/shared-types/fixtures/route-result.json";
import { render, screen } from "@testing-library/react-native";

import { type Navigation, startNavigation } from "../navigation/navigator";
import { NavigationBanner } from "./NavigateScreen";

const directions = result.directions as Direction[];
const points = result.points as [number, number][];

/** Following the route, with the footway beside Via Rosmini as the next turn. */
function beforeFootway(footway: Direction): Navigation {
  const { navigation } = startNavigation(points, [
    directions[0],
    directions[1],
    footway,
    ...directions.slice(3),
  ]);
  return { ...navigation, next: 2, saidUpTo: 2, alongM: 1900 };
}

test("the banner says the street beside an unnamed road", async () => {
  const navigation = beforeFootway(directions[2]);
  await render(
    <NavigationBanner state={{ status: "following", navigation, position: null }} />,
  );
  expect(
    screen.getByText("Turn left onto the footpath beside Via Rosmini"),
  ).toBeTruthy();
});

test("the banner reads as before when the API has no along", async () => {
  const { along: _along, ...old } = directions[2];
  const navigation = beforeFootway(old);
  await render(
    <NavigationBanner state={{ status: "following", navigation, position: null }} />,
  );
  expect(screen.getByText("Turn left onto the footpath")).toBeTruthy();
});
