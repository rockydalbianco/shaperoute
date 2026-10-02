import { act, renderHook } from "@testing-library/react-native";

import { routeAds } from "./admob";
import { NO_ADS, type RouteAds } from "./routeAds";
import { useAdBeforeRoute } from "./useAdBeforeRoute";

type State =
  { status: "idle" } | { status: "waiting" } | { status: "done"; id: number };

/** An ad network the test drives: ready or not, and closed when it says. */
function fakeAds(ready: boolean) {
  let close: () => void = () => {};
  const ads: RouteAds & { prepared: number; shown: number } = {
    prepared: 0,
    shown: 0,
    prepare: () => {
      ads.prepared += 1;
    },
    ready: () => ready,
    show: () => {
      ads.shown += 1;
      return new Promise<void>((resolve) => {
        close = resolve;
      });
    },
  };
  return { ads, close: () => close() };
}

function render(ads: RouteAds, first: State) {
  const get = () => ads;
  return renderHook(({ state }: { state: State }) => useAdBeforeRoute(state, get), {
    initialProps: { state: first },
  });
}

const WAITING: State = { status: "waiting" };

describe("useAdBeforeRoute", () => {
  it("gets an ad ready while the route is drawn", async () => {
    const { ads } = fakeAds(false);
    await render(ads, WAITING);
    expect(ads.prepared).toBe(1);
  });

  it("keeps the route behind the ad, and shows it when the ad is closed", async () => {
    const { ads, close } = fakeAds(true);
    const hook = await render(ads, WAITING);
    const route: State = { status: "done", id: 1 };
    await hook.rerender({ state: route });
    expect(hook.result.current).toBe(WAITING);
    expect(ads.shown).toBe(1);

    await act(async () => close());
    expect(hook.result.current).toBe(route);
    await hook.rerender({ state: route });
    expect(ads.shown).toBe(1);
  });

  it("shows the route at once when there is no ad", async () => {
    const { ads } = fakeAds(false);
    const hook = await render(ads, WAITING);
    const route: State = { status: "done", id: 1 };
    await hook.rerender({ state: route });
    expect(hook.result.current).toBe(route);
    expect(ads.shown).toBe(0);
  });

  it("shows no ad for anything but a ready route", async () => {
    const { ads } = fakeAds(true);
    const hook = await render(ads, { status: "idle" });
    await hook.rerender({ state: WAITING });
    const idle: State = { status: "idle" };
    await hook.rerender({ state: idle });
    expect(hook.result.current).toBe(idle);
    expect(ads.shown).toBe(0);
  });

  it("lets a new state through while the ad is up", async () => {
    const { ads } = fakeAds(true);
    const hook = await render(ads, WAITING);
    await hook.rerender({ state: { status: "done", id: 1 } });
    const next: State = { status: "waiting" };
    await hook.rerender({ state: next });
    expect(hook.result.current).toBe(next);
  });
});

describe("routeAds", () => {
  it("has no ads where AdMob is not built in (Expo Go, tests)", () => {
    expect(routeAds()).toBe(NO_ADS);
  });
});
