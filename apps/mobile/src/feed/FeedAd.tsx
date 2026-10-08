import { Image, StyleSheet, Text, View } from "react-native";
import type { NativeAd } from "react-native-google-mobile-ads";

import type { AdViews } from "../ads/feedAds";
import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/** The shape of an ad's picture when it does not say: a wide screen's. */
const MEDIA_RATIO = 16 / 9;
/** Clear at the right of the top line, for the SDK's AdChoices mark. */
const AD_CHOICES_SPACE = space.xl + space.sm;

/**
 * How tall the picture or video of an ad `width` wide is, for its shape
 * (width over height): as it is, but never taller than wide.
 */
export function mediaHeight(width: number, aspectRatio: number | undefined): number {
  const ratio =
    aspectRatio !== undefined && aspectRatio > 0 ? aspectRatio : MEDIA_RATIO;
  return Math.round(width / Math.max(ratio, 1));
}

type Props = {
  ad: NativeAd;
  /** The SDK's views (`FeedAds.views`). */
  views: AdViews;
  /** How wide the card is, as a post. */
  width: number;
};

/**
 * An ad between the posts of «Feed» (TASK-235, ADR-0198): as wide and as
 * round as a post, and nothing of a runner's: no initial, no score, no
 * times, and a tap opens what the ad says, not the map. «Sponsored» comes
 * first, as large as a runner's name: AdMob's rules for native ads ask that
 * nobody take it for a post. The SDK puts its AdChoices mark at the top
 * right, and counts the view and the taps.
 */
export function FeedAd({ ad, views, width }: Props) {
  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = views;
  return (
    <NativeAdView nativeAd={ad} style={styles.card} testID="feed-ad">
      <View style={styles.who}>
        {ad.icon !== null && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image
              style={styles.icon}
              source={{ uri: ad.icon.url }}
              accessible={false}
            />
          </NativeAsset>
        )}
        <View style={styles.names}>
          <Text style={styles.sponsored}>{t("Sponsored")}</Text>
          {ad.advertiser !== null && ad.advertiser !== "" && (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={styles.advertiser} numberOfLines={1}>
                {ad.advertiser}
              </Text>
            </NativeAsset>
          )}
        </View>
      </View>
      <NativeMediaView
        style={[
          styles.media,
          { width, height: mediaHeight(width, ad.mediaContent?.aspectRatio) },
        ]}
        resizeMode="contain"
      />
      <View style={styles.words}>
        <NativeAsset assetType={NativeAssetType.HEADLINE}>
          <Text style={styles.headline} numberOfLines={2}>
            {ad.headline}
          </Text>
        </NativeAsset>
        {ad.body !== "" && (
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text style={styles.body} numberOfLines={3}>
              {ad.body}
            </Text>
          </NativeAsset>
        )}
        {ad.callToAction !== "" && (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <View style={styles.action} collapsable={false}>
              <Text style={styles.actionText}>{ad.callToAction}</Text>
            </View>
          </NativeAsset>
        )}
      </View>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  who: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    paddingRight: AD_CHOICES_SPACE,
  },
  // Square, not round: a runner's picture is round.
  icon: {
    width: MIN_TAP_SIZE - space.sm,
    height: MIN_TAP_SIZE - space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceRaised,
  },
  names: {
    flex: 1,
    gap: 2,
  },
  // As large and as clear as a runner's name (FeedPost).
  sponsored: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  advertiser: {
    color: color.textMuted,
    fontSize: fontSize.detail,
  },
  media: {
    backgroundColor: color.background,
  },
  words: {
    gap: space.xs,
    padding: space.md,
  },
  headline: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  body: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  // A button, but not a yellow one: yellow is the route's.
  action: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: MIN_TAP_SIZE,
    marginTop: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  actionText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
