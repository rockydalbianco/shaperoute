import { act, renderHook } from "@testing-library/react-native";

import { routeAds } from "./admob";
import { NO_ADS, type RouteAds } from "./routeAds";
import { useAdBeforeRoute } from "./useAdBeforeRoute";

type State =
  | { status: "idle" }
  | { status: "waiting"; phase: number }
  | { status: "done"; id: number }
  | { status: "failed" };

/** An ad network the test drives: ready or not, and closed when it says. */
function fakeAds(ready: boolean) {
  let close: () => void = () => {};
  const ads: RouteAds & { prepared: number; shown: number; ready: () => boolean } = {
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

const IDLE: State = { status: "idle" };
const waiting = (phase = 0): State => ({ status: "waiting", phase });

describe("useAdBeforeRoute", () => {
  it("shows a loaded ad as soon as a search starts, over the wait", async () => {
    const { ads } = fakeAds(true);
    const hook = await render(ads, IDLE);
    expect(ads.shown).toBe(0);
    const wait = waiting();
    await hook.rerender({ state: wait });
    expect(ads.shown).toBe(1);
    // The wait stays on screen behind the ad.
    expect(hook.result.current).toBe(wait);
  });

  it("shows one ad per search, not one per progress step", async () => {
    const { ads } = fakeAds(true);
    const hook = await render(ads, IDLE);
    await hook.rerender({ state: waiting(0) });
    await hook.rerender({ state: waiting(1) });
    await hook.rerender({ state: waiting(2) });
    expect(ads.shown).toBe(1);
  });

  it("lets the route arrive behind the ad, shown as it is when the ad closes", async () => {
    const { ads, close } = fakeAds(true);
    const hook = await render(ads, IDLE);
    await hook.rerender({ state: waiting() });
    const route: State = { status: "done", id: 1 };
    await hook.rerender({ state: route });
    expect(hook.result.current).toBe(route);
    await act(async () => close());
    expect(hook.result.current).toBe(route);
    expect(ads.shown).toBe(1);
  });

  it("goes on without an ad when none is loaded, and loads one for the next", async () => {
    const { ads } = fakeAds(false);
    const hook = await render(ads, IDLE);
    await hook.rerender({ state: waiting() });
    expect(ads.shown).toBe(0);
    expect(ads.prepared).toBe(1);
    const route: State = { status: "done", id: 1 };
    await hook.rerender({ state: route });
    expect(hook.result.current).toBe(route);
    expect(ads.shown).toBe(0);
  });

  it("shows an ad again for the next search", async () => {
    const { ads, close } = fakeAds(true);
    const hook = await render(ads, IDLE);
    await hook.rerender({ state: waiting() });
    await act(async () => close());
    await hook.rerender({ state: { status: "done", id: 1 } });
    await hook.rerender({ state: waiting() });
    expect(ads.shown).toBe(2);
  });

  it("shows no ad for anything but the start of a search", async () => {
    const { ads } = fakeAds(true);
    const hook = await render(ads, IDLE);
    await hook.rerender({ state: { status: "done", id: 1 } });
    await hook.rerender({ state: { status: "failed" } });
    await hook.rerender({ state: IDLE });
    expect(ads.shown).toBe(0);
    expect(ads.prepared).toBe(0);
  });
});

describe("routeAds", () => {
  it("has no ads where AdMob is not built in (Expo Go, tests)", () => {
    expect(routeAds()).toBe(NO_ADS);
  });
});
