/**
 * «Save» and «Start» side by side under a route drawn from an edit («Edit &
 * run» of a post, «Edit the drawing» of «Explore»): «Save» keeps it among
 * the favorites, as the heart over the map, and says «Saved» once kept.
 * Without an edit «Start» stays alone, as before.
 */
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import type { RouteRequest, RouteResult } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Keepable } from "../favorites/favoriteRoute";
import { FavoritesContext, type FavoritesDoor } from "../favorites/favoritesDoor";
import { SaveRouteButton } from "../favorites/SaveRouteButton";
import { RouteOutcome } from "./RoutePanel";

const request: RouteRequest = {
  start: [46.0671, 11.1214],
  shape: "heart",
  distance_m: 5000,
  activity: "running",
};

const result = jobDone.result as unknown as RouteResult;

const route = { id: "route-key", request: {} } as unknown as Keepable;

function outcome({
  save,
  onStart = jest.fn(),
  done = result,
}: {
  save?: ReactNode;
  onStart?: jest.Mock;
  done?: RouteResult;
}) {
  return (
    <RouteOutcome
      view={{ status: "done", request, result: done }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={jest.fn()}
      onPickShape={jest.fn()}
      onStart={onStart}
      onSignal={jest.fn()}
      save={save}
    />
  );
}

function favoritesWith(kept: boolean, press: jest.Mock): FavoritesDoor {
  return {
    has: (id: string) => kept && id === route.id,
    press,
  } as unknown as FavoritesDoor;
}

test("after an edit: «Save» and «Start», «Start» still starts", async () => {
  const onStart = jest.fn();
  const press = jest.fn();
  await render(
    <FavoritesContext.Provider value={favoritesWith(false, press)}>
      {outcome({ save: <SaveRouteButton route={route} />, onStart })}
    </FavoritesContext.Provider>,
  );
  expect(screen.getByRole("button", { name: "Save" })).not.toBeSelected();
  await fireEvent.press(screen.getByRole("button", { name: "Start" }));
  expect(onStart).toHaveBeenCalledTimes(1);
  expect(press).not.toHaveBeenCalled();
});

test("«Save» keeps the route among the favorites, as the heart", async () => {
  const press = jest.fn();
  await render(
    <FavoritesContext.Provider value={favoritesWith(false, press)}>
      {outcome({ save: <SaveRouteButton route={route} /> })}
    </FavoritesContext.Provider>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
  expect(press).toHaveBeenCalledWith(route);
});

test("a route already kept says «Saved»", async () => {
  await render(
    <FavoritesContext.Provider value={favoritesWith(true, jest.fn())}>
      {outcome({ save: <SaveRouteButton route={route} /> })}
    </FavoritesContext.Provider>,
  );
  expect(screen.getByRole("button", { name: "Saved" })).toBeSelected();
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
});

test("a route without turns keeps «Save», with no «Start»", async () => {
  await render(
    <FavoritesContext.Provider value={favoritesWith(false, jest.fn())}>
      {outcome({
        save: <SaveRouteButton route={route} />,
        done: { ...result, directions: [] },
      })}
    </FavoritesContext.Provider>,
  );
  expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
});

test("without an edit «Start» is alone, as before", async () => {
  await render(outcome({}));
  expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
});
