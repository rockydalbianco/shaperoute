/**
 * The outings on a group's page (TASK-495 part C2): a favorite becomes the
 * route of an outing as the heart would keep it; «With a route» chooses one
 * of the Favorites and opens the form of an outing of the group.
 */
import favorite from "@shaperoute/shared-types/fixtures/favorite.json";
import favoriteCycling from "@shaperoute/shared-types/fixtures/favorite-cycling.json";
import favoriteOnFoot from "@shaperoute/shared-types/fixtures/favorite-on-foot.json";
import request from "@shaperoute/shared-types/fixtures/favorite-request.json";
import requestCycling from "@shaperoute/shared-types/fixtures/favorite-request-cycling.json";
import requestOnFoot from "@shaperoute/shared-types/fixtures/favorite-request-on-foot.json";
import requestTurned from "@shaperoute/shared-types/fixtures/favorite-request-turned.json";
import requestWalks from "@shaperoute/shared-types/fixtures/favorite-request-walks.json";
import favoriteTurned from "@shaperoute/shared-types/fixtures/favorite-turned.json";
import favoriteWalks from "@shaperoute/shared-types/fixtures/favorite-walks.json";
import favorites from "@shaperoute/shared-types/fixtures/favorites.json";
import group from "@shaperoute/shared-types/fixtures/group.json";
import type { GroupDetail } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { FavoriteDetail } from "../api/favorites";
import { keepableOfFavorite, NewOutingButton } from "./GroupOutings";
import { fakeApi, SignedIn } from "./testing";

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return {
    ...actual,
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    },
  };
});

const GROUP = group as unknown as GroupDetail;

test("a favorite is the route of an outing, as the heart keeps it", () => {
  for (const [detail, kept] of [
    [favorite, request],
    [favoriteCycling, requestCycling],
    [favoriteOnFoot, requestOnFoot],
    [favoriteTurned, requestTurned],
    [favoriteWalks, requestWalks],
  ] as const) {
    const route = keepableOfFavorite(detail as unknown as FavoriteDetail);
    expect(route.id).toBe(detail.id);
    expect(route.request).toEqual(kept);
  }
});

test("«With a route»: one of the Favorites, then the form of an outing of the group", async () => {
  const [first] = favorites.favorites;
  const { fetchFn, calls } = fakeApi({
    "GET /me/favorites": { status: 200, body: favorites },
    [`GET /me/favorites/${first!.id}`]: { status: 200, body: favorite },
  });
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(
    <SignedIn>
      <NewOutingButton group={GROUP} onPublished={() => {}} fetchFn={fetchFn} />
    </SignedIn>,
  );
  await fireEvent.press(screen.getByTestId("group-new-outing"));
  const buttons = alert.mock.calls[0]![2]!;
  await act(async () => buttons[0]!.onPress!());
  await fireEvent.press(await screen.findByTestId(`outing-favorite-${first!.id}`));
  // The form of a route, with the group chosen and «Members only».
  expect(await screen.findByTestId("group-run-group")).toBeTruthy();
  expect(
    screen.getByTestId(`group-run-group-${GROUP.id}`).props.accessibilityState,
  ).toEqual({ selected: true });
  expect(screen.getByTestId("group-run-group").props.accessibilityState).toEqual({
    selected: true,
  });
  expect(calls.map((call) => call.path)).toContain(`/me/favorites/${first!.id}`);
  alert.mockRestore();
});

test("a group of only the gym has no outing without a route", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(
    <SignedIn>
      <NewOutingButton
        group={{ ...GROUP, sports: ["gym"] }}
        onPublished={() => {}}
        fetchFn={fakeApi({}).fetchFn}
      />
    </SignedIn>,
  );
  await fireEvent.press(screen.getByTestId("group-new-outing"));
  expect(alert.mock.calls[0]![2]!.map((button) => button.text)).toEqual([
    "With a route",
    "Not now",
  ]);
  alert.mockRestore();
});
