import type { ReactElement, ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import type { NativeAd } from "react-native-google-mobile-ads";

import type { AdViews } from "./feedAds";

/**
 * The SDK's views of a native ad, as plain views, for the tests
 * (TASK-235): each part of the ad says which asset it is.
 */
export const FAKE_AD_VIEWS = {
  NativeAdView: ({ children, ...props }: ViewProps & { children?: ReactNode }) => (
    <View {...props}>{children}</View>
  ),
  NativeAsset: ({
    assetType,
    children,
  }: {
    assetType: string;
    children: ReactElement;
  }) => <View testID={`asset-${assetType}`}>{children}</View>,
  NativeAssetType: {
    ADVERTISER: "advertiser",
    BODY: "body",
    CALL_TO_ACTION: "callToAction",
    HEADLINE: "headline",
    ICON: "icon",
  },
  NativeMediaView: (props: ViewProps) => <View testID="ad-media" {...props} />,
} as unknown as AdViews;

/** A native ad as the SDK gives it, for the tests. */
export function fakeNativeAd(fields: Partial<NativeAd> = {}): NativeAd {
  return {
    headline: "Trail shoes, 20% off",
    body: "Light, with grip on wet rock.",
    advertiser: "Shoe Shop",
    callToAction: "Shop now",
    icon: { url: "https://example.com/icon.png", scale: 1 },
    mediaContent: { aspectRatio: 2, hasVideoContent: false, duration: 0 },
    destroy: () => {},
    ...fields,
  } as NativeAd;
}
