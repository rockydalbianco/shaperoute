import type { NativeAd } from "react-native-google-mobile-ads";

/**
 * Native ads between the posts of «Feed» (TASK-235, ADR-0198), in place of
 * the full-screen ad of a search (ADR-0102). Nothing here may hold the Feed
 * back: without an ad, consent or network, the posts show as before.
 */

/** The SDK's views that show a native ad (FeedAd.tsx). */
export type AdViews = Pick<
  typeof import("react-native-google-mobile-ads"),
  "NativeAdView" | "NativeAsset" | "NativeAssetType" | "NativeMediaView"
>;

/** What «Feed» needs from an ad network. */
export type FeedAds = {
  /** One native ad, or null when there is none: no consent, no ad to
   * give, no network. Never rejects. */
  load(): Promise<NativeAd | null>;
  /** The views of its ads: null where there is no ad network. */
  views: AdViews | null;
};

/** Expo Go, the web, tests: no ad network, the Feed has its posts only. */
export const NO_FEED_ADS: FeedAds = {
  load: () => Promise.resolve(null),
  views: null,
};

/** The ad network: tests stand in for it. */
export type AdSdk = {
  /** Asks for consent where the law wants it, then starts the SDK.
   * True when ads may be requested. */
  start(): Promise<boolean>;
  /** Loads one native ad; rejects when there is none. */
  nativeAd(): Promise<NativeAd>;
  views: AdViews;
};

export function createFeedAds(sdk: AdSdk): FeedAds {
  let started: Promise<boolean> | null = null;
  return {
    views: sdk.views,
    async load() {
      // Consent asked once; asked again only after an error (no network).
      started ??= sdk.start().catch(() => {
        started = null;
        return false;
      });
      if (!(await started)) {
        return null;
      }
      try {
        return await sdk.nativeAd();
      } catch {
        return null;
      }
    },
  };
}
