import { Platform, TurboModuleRegistry } from "react-native";

import { type AdSdk, createFeedAds, type FeedAds, NO_FEED_ADS } from "./feedAds";

type GoogleMobileAds = typeof import("react-native-google-mobile-ads");

/**
 * Google AdMob (ADR-0102, ADR-0198). Only in a build of the app: Expo Go
 * has no AdMob native code, so there the module is not even loaded.
 */
function admobSdk(): AdSdk | null {
  if (
    Platform.OS === "web" ||
    TurboModuleRegistry.get("RNGoogleMobileAdsModule") === null
  ) {
    return null;
  }
  let ads: GoogleMobileAds;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ads = require("react-native-google-mobile-ads") as GoogleMobileAds;
  } catch {
    return null;
  }
  const {
    AdsConsent,
    NativeAd,
    NativeAdView,
    NativeAsset,
    NativeAssetType,
    NativeMediaAspectRatio,
    NativeMediaView,
    TestIds,
  } = ads;
  // Google's test ad until the AdMob account gives the real one (TASK-153).
  const unitId =
    Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_NATIVE_IOS,
      android: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ANDROID,
    }) || TestIds.NATIVE;

  return {
    async start() {
      // Google's consent form (UMP): shown only where the law asks for it.
      const consent = await AdsConsent.gatherConsent();
      if (!consent.canRequestAds) {
        return false;
      }
      await ads.default().initialize();
      return true;
    },
    // As wide as a drawing of «Feed», and as tall, more or less.
    nativeAd: () =>
      NativeAd.createForAdRequest(unitId, {
        aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
      }),
    views: { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView },
  };
}

let shared: FeedAds | null = null;

/** The app's ads, made the first time they are needed. */
export function feedAds(): FeedAds {
  if (shared === null) {
    const sdk = admobSdk();
    shared = sdk ? createFeedAds(sdk) : NO_FEED_ADS;
  }
  return shared;
}
