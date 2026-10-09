import { Platform, TurboModuleRegistry } from "react-native";

import { type AdSdk, createFeedAds, type FeedAds, NO_FEED_ADS } from "./feedAds";
import {
  createPrivacyOptions,
  NO_PRIVACY_OPTIONS,
  type PrivacyOptions,
} from "./privacyOptions";

type GoogleMobileAds = typeof import("react-native-google-mobile-ads");

/**
 * Google AdMob (ADR-0102, ADR-0198). Only in a build of the app: Expo Go
 * has no AdMob native code, so there the module is not even loaded.
 */
function googleMobileAds(): GoogleMobileAds | null {
  if (
    Platform.OS === "web" ||
    TurboModuleRegistry.get("RNGoogleMobileAdsModule") === null
  ) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-google-mobile-ads") as GoogleMobileAds;
  } catch {
    return null;
  }
}

function admobSdk(): AdSdk | null {
  const ads = googleMobileAds();
  if (ads === null) {
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

let sharedOptions: PrivacyOptions | null = null;

/** Google's «Privacy options» (TASK-153), from the same SDK as the ads. */
export function privacyOptions(): PrivacyOptions {
  if (sharedOptions === null) {
    const ads = googleMobileAds();
    sharedOptions = ads ? createPrivacyOptions(ads.AdsConsent) : NO_PRIVACY_OPTIONS;
  }
  return sharedOptions;
}
