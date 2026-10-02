import type { RouteResult } from "@shaperoute/shared-types";
import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";
import listed from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { type Explored, optionsOf } from "./explored";
import { ExploredCard } from "./ExploredCard";
import { isRecommendedList, type RecommendedRouteDetail } from "./recommendedRoutes";
import type { StartView } from "./useStartDirections";

const [route] = isRecommendedList(listed) ? listed.routes : [];
const whole = detail as RecommendedRouteDetail;
const shorter: RecommendedRouteDetail = {
  ...whole,
  id: `${whole.id}:1`,
  route_m: 4630,
  similarity: 0.81,
};

/** A route open on the map, with `others` to choose from besides it. */
function opened(others: RecommendedRouteDetail[], chosen = 0) {
  const options = optionsOf(route, whole, others);
  const choose = jest.fn();
  const explored: Explored = {
    status: "done",
    ...options[chosen],
    choices: options.map((option): RouteResult => option.result),
    chosen,
    choose,
  };
  return { explored, choose };
}

async function card(explored: Explored, start: StartView = { status: "idle" }) {
  await render(
    <ExploredCard
      explored={explored}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onList={jest.fn()}
      start={start}
      onStart={jest.fn()}
    />,
  );
}

test("an example with alternatives has the tiles A · B, above Start", async () => {
  const { explored, choose } = opened([shorter]);
  await card(explored);
  expect(screen.getByTestId("route-A")).toBeSelected();
  expect(screen.getByText("4.6 km · 81%")).toBeOnTheScreen();
  expect(screen.getByText("Start")).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId("route-B"));
  expect(choose).toHaveBeenCalledWith(1);
});

test("the card is about the route chosen", async () => {
  const { explored } = opened([shorter], 1);
  await card(explored);
  expect(screen.getByTestId("route-B")).toBeSelected();
  expect(screen.getByText("4.6 km")).toBeOnTheScreen();
  expect(screen.getByText(/looks 81% like it/)).toBeOnTheScreen();
});

test("a route alone has no tiles", async () => {
  const { explored } = opened([]);
  await card(explored);
  expect(screen.queryByTestId("route-A")).toBeNull();
  expect(screen.getByText("Start")).toBeOnTheScreen();
});

test("while the directions come, the route chosen stays", async () => {
  const { explored, choose } = opened([shorter]);
  await card(explored, { status: "loading" });
  await fireEvent.press(screen.getByTestId("route-B"));
  expect(choose).not.toHaveBeenCalled();
});
