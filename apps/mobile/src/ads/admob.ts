import { Platform, TurboModuleRegistry } from "react-native";

import { type AdSdk, createRouteAds, NO_ADS, type RouteAds } from "./routeAds";

type GoogleMobileAds = typeof import("react-native-google-mobile-ads");

/**
 * Google AdMob (ADR-0102). Only in a build of the app: Expo Go has no
 * AdMob native code, so there the module is not even loaded.
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
  const { AdEventType, AdsConsent, InterstitialAd, TestIds } = ads;
  // Google's test ad until the AdMob account gives the real one.
  const unitId =
    Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS,
      android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID,
    }) || TestIds.INTERSTITIAL;

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
    interstitial() {
      const ad = InterstitialAd.createForAdRequest(unitId);
      return {
        load: () => ad.load(),
        show: () => ad.show(),
        onLoaded: (listener) =>
          void ad.addAdEventListener(AdEventType.LOADED, listener),
        onClosed: (listener) =>
          void ad.addAdEventListener(AdEventType.CLOSED, listener),
        onError: (listener) => void ad.addAdEventListener(AdEventType.ERROR, listener),
        destroy: () => ad.destroy(),
      };
    },
  };
}

let shared: RouteAds | null = null;

/** The app's ads, made the first time they are needed. */
export function routeAds(): RouteAds {
  if (shared === null) {
    const sdk = admobSdk();
    shared = sdk ? createRouteAds(sdk) : NO_ADS;
  }
  return shared;
}
