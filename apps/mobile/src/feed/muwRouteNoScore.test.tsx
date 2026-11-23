import route from "@shaperoute/shared-types/fixtures/muw-route.json";
import list from "@shaperoute/shared-types/fixtures/muw-routes.json";
import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";
import listed from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import type { MuwRoute } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import { type Explored, optionsOf } from "../explore/explored";
import { ExploredCard } from "../explore/ExploredCard";
import {
  cityName,
  isRecommendedList,
  type RecommendedRoute,
  type RecommendedRouteDetail,
  routeTitle,
} from "../explore/recommendedRoutes";
import { muwCardRoute, muwDetail } from "./muwRoute";

/**
 * A MuW route has no likeness to tell (TASK-405): its card says what and
 * where, never «looks 100% like it». A route of «Explore» keeps its line.
 */

const CARD = list.routes[0] as unknown as MuwRoute;
const [EXPLORE] = isRecommendedList(listed) ? listed.routes : [];

/** The route open on the map, alone: as App opens one from the Feed. */
function opened(shown: RecommendedRoute, whole: RecommendedRouteDetail): Explored {
  const [option] = optionsOf(shown, whole);
  return {
    status: "done",
    ...option,
    choices: [option.result],
    chosen: 0,
    choose: jest.fn(),
    others: [],
  };
}

async function card(explored: Explored) {
  await render(
    <ExploredCard
      explored={explored}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onList={jest.fn()}
      start={{ status: "idle" }}
      onStart={jest.fn()}
    />,
  );
}

test.each([
  [
    "while it loads",
    (): Explored => ({ status: "loading", route: muwCardRoute(CARD) }),
  ],
  ["open", () => opened(muwCardRoute(CARD), muwDetail(route as never))],
])("a MuW route %s says its title and city, no percent", async (_, explored) => {
  await card(explored());
  const shown = muwCardRoute(CARD);
  expect(
    screen.getByText(`${routeTitle(shown)} · ${cityName(CARD.city)}`),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/looks/)).toBeNull();
  expect(screen.queryByText(/%/)).toBeNull();
});

test("a route of «Explore» still says how much it looks like its figure", async () => {
  const whole = detail as RecommendedRouteDetail;
  await card(opened(EXPLORE, whole));
  const percent = Math.round(whole.similarity * 100);
  expect(EXPLORE.scored).toBeUndefined();
  expect(
    screen.getByText(
      `${routeTitle(EXPLORE)} · ${cityName(EXPLORE.city)} · looks ${percent}% like it`,
    ),
  ).toBeOnTheScreen();
});
