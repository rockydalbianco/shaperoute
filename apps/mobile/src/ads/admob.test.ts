import type { FeedAds } from "./feedAds";

/**
 * Expo Go has no AdMob native code (ADR-0102): there the package must not
 * even be loaded, and «Feed» has its posts only.
 */
function load({
  nativeModule,
  packageThrows = false,
}: {
  nativeModule: boolean;
  packageThrows?: boolean;
}) {
  const packageLoaded = jest.fn();
  let ads: FeedAds | undefined;
  let noAds: FeedAds | undefined;
  jest.isolateModules(() => {
    jest.doMock("react-native-google-mobile-ads", () => {
      packageLoaded();
      if (packageThrows) {
        throw new Error("no native module");
      }
      return {
        __esModule: true,
        default: () => ({ initialize: () => Promise.resolve([]) }),
        AdsConsent: { gatherConsent: () => Promise.resolve({ canRequestAds: true }) },
        NativeAd: { createForAdRequest: jest.fn() },
        NativeMediaAspectRatio: { LANDSCAPE: 2 },
        TestIds: { NATIVE: "test-native" },
      };
    });
    const { TurboModuleRegistry } =
      jest.requireActual<typeof import("react-native")>("react-native");
    jest
      .spyOn(TurboModuleRegistry, "get")
      .mockImplementation((name: string) =>
        nativeModule && name === "RNGoogleMobileAdsModule" ? ({} as never) : null,
      );
    // Fresh modules for each case: feedAds() keeps the first answer.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ads = (require("./admob") as typeof import("./admob")).feedAds();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    noAds = (require("./feedAds") as typeof import("./feedAds")).NO_FEED_ADS;
  });
  return { ads: ads!, noAds: noAds!, packageLoaded };
}

describe("feedAds in Expo Go and in a build", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("never loads the AdMob package without its native module (Expo Go)", () => {
    const { ads, noAds, packageLoaded } = load({ nativeModule: false });
    expect(ads).toBe(noAds);
    expect(packageLoaded).not.toHaveBeenCalled();
    // «Feed» then shows its posts only.
    expect(ads.views).toBeNull();
    return expect(ads.load()).resolves.toBeNull();
  });

  it("has no ads when the package fails to load", () => {
    const { ads, noAds, packageLoaded } = load({
      nativeModule: true,
      packageThrows: true,
    });
    expect(packageLoaded).toHaveBeenCalledTimes(1);
    expect(ads).toBe(noAds);
  });

  it("uses AdMob when the native module is there (a build of the app)", () => {
    const { ads, noAds, packageLoaded } = load({ nativeModule: true });
    expect(packageLoaded).toHaveBeenCalledTimes(1);
    expect(ads).not.toBe(noAds);
  });
});
