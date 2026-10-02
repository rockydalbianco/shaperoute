import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";
import listed from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import done from "@shaperoute/shared-types/fixtures/themed-route-job-done.json";
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { type Explored, toRequest, toResult } from "./explored";
import { ExploredCard } from "./ExploredCard";
import {
  isRecommendedDetail,
  isRecommendedList,
  type RecommendedRouteDetail,
} from "./recommendedRoutes";
import { ThemedCard } from "./ThemedCard";
import type { ThemedResult } from "./themedRoutes";
import type { StartView } from "./useStartDirections";

const [route] = isRecommendedList(listed) ? listed.routes : [];
const whole = detail as RecommendedRouteDetail;
const request = toRequest(whole);
const result = toResult(whole);
const explored: Explored =
  request === null
    ? { status: "failed", route }
    : {
        status: "done",
        route,
        detail: whole,
        request,
        result,
        choices: [result],
        chosen: 0,
        choose: jest.fn(),
        others: [],
      };
const themed = done.result as ThemedResult;
const asked = { text: "luoghi famosi a Milano", centre: null, city: null };

async function card(start: StartView, onStart = jest.fn(), state = explored) {
  await render(
    <ExploredCard
      explored={state}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onList={jest.fn()}
      start={start}
      onStart={onStart}
    />,
  );
  return onStart;
}

test("the fixtures are a route of the list, whole", () => {
  expect(isRecommendedDetail(detail)).toBe(true);
  expect(route).toBeDefined();
  expect(explored.status).toBe("done");
});

test("a route of Explore has Start, first, above the GPX", async () => {
  const onStart = await card({ status: "idle" });
  const [first] = screen.getAllByRole("button");
  expect(within(first).getByText("Start")).toBeOnTheScreen();
  expect(screen.getByText("Export GPX")).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Start"));
  expect(onStart).toHaveBeenCalledTimes(1);
});

test("while the directions come, Start waits and cannot be pressed", async () => {
  const onStart = await card({ status: "loading" });
  expect(screen.queryByText("Start")).toBeNull();
  await fireEvent.press(screen.getByText("Getting directions…"));
  expect(onStart).not.toHaveBeenCalled();
});

test("without directions it says why, and Start tries again", async () => {
  const message = "The map of this area could not be loaded for directions.";
  const onStart = await card({ status: "failed", message });
  expect(screen.getByText(message)).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Start"));
  expect(onStart).toHaveBeenCalledTimes(1);
});

test("no Start while the route loads or when it did not", async () => {
  await card({ status: "idle" }, jest.fn(), { status: "loading", route });
  expect(screen.queryByText("Start")).toBeNull();
  await card({ status: "idle" }, jest.fn(), { status: "failed", route });
  expect(screen.queryByText("Start")).toBeNull();
});

test("a themed route has Start too, only once it is drawn", async () => {
  const onStart = jest.fn();
  const { rerender } = await render(
    <ThemedCard
      state={{ status: "done", request: asked, result: themed }}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onCancel={jest.fn()}
      start={{ status: "idle" }}
      onStart={onStart}
    />,
  );
  await fireEvent.press(screen.getByText("Start"));
  expect(onStart).toHaveBeenCalledTimes(1);
  await rerender(
    <ThemedCard
      state={{ status: "waiting", request: asked }}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onCancel={jest.fn()}
      start={{ status: "idle" }}
      onStart={onStart}
    />,
  );
  expect(screen.queryByText("Start")).toBeNull();
});
