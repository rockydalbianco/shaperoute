import { type AdSdk, createRouteAds, type Interstitial } from "./routeAds";

/** A stand-in ad network: the test says when the ad loads, fails or closes. */
function fakeSdk({ allowed = true }: { allowed?: boolean } = {}) {
  const made: (Interstitial & {
    loaded: () => void;
    closed: () => void;
    failed: () => void;
    destroyed: boolean;
    showFails: boolean;
  })[] = [];
  const sdk: AdSdk & { starts: number } = {
    starts: 0,
    start: () => {
      sdk.starts += 1;
      return Promise.resolve(allowed);
    },
    interstitial: () => {
      const on = {
        loaded: [] as (() => void)[],
        closed: [] as (() => void)[],
        error: [] as (() => void)[],
      };
      const ad = {
        destroyed: false,
        showFails: false,
        load: () => {},
        show: () =>
          ad.showFails ? Promise.reject(new Error("no")) : Promise.resolve(),
        onLoaded: (f: () => void) => void on.loaded.push(f),
        onClosed: (f: () => void) => void on.closed.push(f),
        onError: (f: () => void) => void on.error.push(f),
        destroy: () => {
          ad.destroyed = true;
        },
        loaded: () => on.loaded.forEach((f) => f()),
        closed: () => on.closed.forEach((f) => f()),
        failed: () => on.error.forEach((f) => f()),
      };
      made.push(ad);
      return ad;
    },
  };
  return { sdk, made };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createRouteAds", () => {
  it("is ready once an ad has loaded, and shows it until it is closed", async () => {
    const { sdk, made } = fakeSdk();
    const ads = createRouteAds(sdk);
    ads.prepare();
    await flush();
    expect(ads.ready()).toBe(false);
    made[0].loaded();
    expect(ads.ready()).toBe(true);

    let over = false;
    void ads.show().then(() => {
      over = true;
    });
    await flush();
    expect(over).toBe(false);
    made[0].closed();
    await flush();
    expect(over).toBe(true);
    expect(made[0].destroyed).toBe(true);
  });

  it("asks for consent once, and loads one ad however often a route is asked", async () => {
    const { sdk, made } = fakeSdk();
    const ads = createRouteAds(sdk);
    ads.prepare();
    ads.prepare();
    await flush();
    ads.prepare();
    await flush();
    expect(sdk.starts).toBe(1);
    expect(made).toHaveLength(1);
  });

  it("loads nothing without consent", async () => {
    const { sdk, made } = fakeSdk({ allowed: false });
    const ads = createRouteAds(sdk);
    ads.prepare();
    await flush();
    expect(made).toHaveLength(0);
    expect(ads.ready()).toBe(false);
  });

  it("is not ready when the ad fails to load, and tries again next time", async () => {
    const { sdk, made } = fakeSdk();
    const ads = createRouteAds(sdk);
    ads.prepare();
    await flush();
    made[0].failed();
    expect(ads.ready()).toBe(false);
    ads.prepare();
    await flush();
    expect(made).toHaveLength(2);
  });

  it("ends at once when the ad cannot be shown", async () => {
    const { sdk, made } = fakeSdk();
    const ads = createRouteAds(sdk);
    ads.prepare();
    await flush();
    made[0].showFails = true;
    made[0].loaded();
    await expect(ads.show()).resolves.toBeUndefined();
  });

  it("shows nothing when no ad is loaded", async () => {
    const { sdk } = fakeSdk();
    const ads = createRouteAds(sdk);
    await expect(ads.show()).resolves.toBeUndefined();
  });

  it("loads the next ad as soon as one is closed, for the next route", async () => {
    const { sdk, made } = fakeSdk();
    const ads = createRouteAds(sdk);
    ads.prepare();
    await flush();
    made[0].loaded();
    const first = ads.show();
    made[0].closed();
    await first;
    await flush();

    expect(made).toHaveLength(2);
    expect(ads.ready()).toBe(false);
    made[1].loaded();
    expect(ads.ready()).toBe(true);
  });

  it("shows an ad for every route, however close together", async () => {
    const { sdk, made } = fakeSdk();
    const ads = createRouteAds(sdk);
    ads.prepare();
    await flush();
    for (const round of [0, 1, 2]) {
      made[round].loaded();
      expect(ads.ready()).toBe(true);
      const shown = ads.show();
      made[round].closed();
      await shown;
      await flush();
    }
    expect(made.filter((ad) => ad.destroyed)).toHaveLength(3);
    expect(sdk.starts).toBe(1);
  });
});
