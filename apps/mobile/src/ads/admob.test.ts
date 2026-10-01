import type { RouteAds } from "./routeAds";

/**
 * Expo Go has no AdMob native code (ADR-0102): there the package must not
 * even be loaded, and the route shows as before.
 */
function load({
  nativeModule,
  packageThrows = false,
}: {
  nativeModule: boolean;
  packageThrows?: boolean;
}) {
  const packageLoaded = jest.fn();
  let ads: RouteAds | undefined;
  let noAds: RouteAds | undefined;
  jest.isolateModules(() => {
    jest.doMock("react-native-google-mobile-ads", () => {
      packageLoaded();
      if (packageThrows) {
        throw new Error("no native module");
      }
      return {
        __esModule: true,
        default: () => ({ initialize: () => Promise.resolve([]) }),
        AdEventType: { LOADED: "loaded", CLOSED: "closed", ERROR: "error" },
        AdsConsent: { gatherConsent: () => Promise.resolve({ canRequestAds: true }) },
        InterstitialAd: { createForAdRequest: jest.fn() },
        TestIds: { INTERSTITIAL: "test-interstitial" },
      };
    });
    const { TurboModuleRegistry } = jest.requireActual<typeof import("react-native")>(
      "react-native",
    );
    jest
      .spyOn(TurboModuleRegistry, "get")
      .mockImplementation((name: string) =>
        nativeModule && name === "RNGoogleMobileAdsModule" ? ({} as never) : null,
      );
    // Fresh modules for each case: routeAds() keeps the first answer.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ads = (require("./admob") as typeof import("./admob")).routeAds();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    noAds = (require("./routeAds") as typeof import("./routeAds")).NO_ADS;
  });
  return { ads: ads!, noAds: noAds!, packageLoaded };
}

describe("routeAds in Expo Go and in a build", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("never loads the AdMob package without its native module (Expo Go)", () => {
    const { ads, noAds, packageLoaded } = load({ nativeModule: false });
    expect(ads).toBe(noAds);
    expect(packageLoaded).not.toHaveBeenCalled();
    // The route screens then show the route at once.
    expect(ads.ready()).toBe(false);
    return expect(ads.show()).resolves.toBeUndefined();
  });

  it("has no ads when the package fails to load", () => {
    const { ads, noAds, packageLoaded } = load({ nativeModule: true, packageThrows: true });
    expect(packageLoaded).toHaveBeenCalledTimes(1);
    expect(ads).toBe(noAds);
  });

  it("uses AdMob when the native module is there (a build of the app)", () => {
    const { ads, noAds, packageLoaded } = load({ nativeModule: true });
    expect(packageLoaded).toHaveBeenCalledTimes(1);
    expect(ads).not.toBe(noAds);
  });
});
