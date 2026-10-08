import type { NativeAd } from "react-native-google-mobile-ads";

import { type AdSdk, type AdViews, createFeedAds, NO_FEED_ADS } from "./feedAds";

const VIEWS = {} as AdViews;

/** A stand-in ad network: the test says what consent and the ads do. */
function fakeSdk({
  start = () => Promise.resolve(true),
  nativeAd = () => Promise.resolve({ headline: "Shoes" } as NativeAd),
}: Partial<Pick<AdSdk, "start" | "nativeAd">> = {}) {
  const sdk = {
    start: jest.fn(start),
    nativeAd: jest.fn(nativeAd),
    views: VIEWS,
  };
  return sdk;
}

test("with consent, gives one native ad each time it is asked", async () => {
  const sdk = fakeSdk();
  const ads = createFeedAds(sdk);
  expect(ads.views).toBe(VIEWS);
  await expect(ads.load()).resolves.toEqual({ headline: "Shoes" });
  await expect(ads.load()).resolves.toEqual({ headline: "Shoes" });
  // Consent is asked once.
  expect(sdk.start).toHaveBeenCalledTimes(1);
  expect(sdk.nativeAd).toHaveBeenCalledTimes(2);
});

test("without consent, no ad is asked for", async () => {
  const sdk = fakeSdk({ start: () => Promise.resolve(false) });
  const ads = createFeedAds(sdk);
  await expect(ads.load()).resolves.toBeNull();
  await expect(ads.load()).resolves.toBeNull();
  expect(sdk.start).toHaveBeenCalledTimes(1);
  expect(sdk.nativeAd).not.toHaveBeenCalled();
});

test("consent that fails (no network) is asked again next time", async () => {
  const sdk = fakeSdk({ start: () => Promise.reject(new Error("offline")) });
  const ads = createFeedAds(sdk);
  await expect(ads.load()).resolves.toBeNull();
  sdk.start.mockImplementation(() => Promise.resolve(true));
  await expect(ads.load()).resolves.toEqual({ headline: "Shoes" });
  expect(sdk.start).toHaveBeenCalledTimes(2);
});

test("no ad to give, or an error: null, never a rejection", async () => {
  const sdk = fakeSdk({ nativeAd: () => Promise.reject(new Error("no fill")) });
  await expect(createFeedAds(sdk).load()).resolves.toBeNull();
});

test("without an ad network, no ads and no views", async () => {
  expect(NO_FEED_ADS.views).toBeNull();
  await expect(NO_FEED_ADS.load()).resolves.toBeNull();
});
