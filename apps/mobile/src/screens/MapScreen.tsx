import { type ReactNode, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import { mapCover, MapCoverContext } from "../map/mapCover";
import { MapKindButton } from "../map/MapKindButton";
import { color, fontSize, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { MapError } from "./ChooseScreen";

type Props = {
  /** The map itself: mounted by the app for both screens, so it never reloads. */
  map: ReactNode;
  /** True on the second screen: the controls over and under the map show. */
  active: boolean;
  onBack: () => void;
  mapError: string | null;
  /** While navigating, the next turn, in place of the way back (TASK-049). */
  banner?: ReactNode;
  /** The north arrow of a turned map (TASK-232): under the way back or the
   * banner, on the right. */
  compass?: ReactNode;
  /** The wait, the route or the problem (RouteOutcome). */
  children: ReactNode;
};

/**
 * The second screen (TASK-051): the map, edge to edge, with a way back and a
 * card underneath. The card sits below the map, not over it, so it never
 * covers the attribution (UI.md).
 */
export function MapScreen({
  map,
  active,
  onBack,
  mapError,
  banner,
  compass,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  // What lies over the top of the map (TASK-443): the map frames its
  // route clear of it. The map goes from side to side of the window; a
  // banner is as high as it turns out.
  const { width } = useWindowDimensions();
  const [rowHeight, setRowHeight] = useState<number | null>(null);
  const hasBanner = banner !== undefined && banner !== null;
  // Without a banner the row is the buttons': its height is not asked, so
  // the menu of the map's kind opening does not frame the map again.
  const bannerHeight = hasBanner ? (rowHeight ?? MIN_TAP_SIZE) : null;
  const hasCompass = compass !== undefined && compass !== null;
  const cover = useMemo(
    () =>
      active
        ? mapCover({
            insetTop: insets.top,
            width,
            bannerHeight,
            compass: hasCompass,
          })
        : null,
    [active, insets.top, width, bannerHeight, hasCompass],
  );
  return (
    <View style={styles.screen}>
      <View style={styles.map} testID="map-area">
        <MapCoverContext.Provider value={cover}>{map}</MapCoverContext.Provider>
        {active && (
          <View
            style={[styles.top, { top: insets.top + space.sm }]}
            // Beside the north arrow a finger is on the map.
            pointerEvents="box-none"
          >
            <View
              style={styles.row}
              testID="map-top-row"
              onLayout={(event) => setRowHeight(event.nativeEvent.layout.height)}
            >
              {banner ?? (
                <Pressable
                  style={styles.back}
                  onPress={onBack}
                  accessibilityRole="button"
                  accessibilityLabel={t("Back")}
                >
                  <Text style={styles.backText}>←</Text>
                </Pressable>
              )}
              {mapError && !banner && (
                <View style={styles.errorBox}>
                  <MapError reason={mapError} />
                </View>
              )}
              {!banner && (
                <View style={styles.end} pointerEvents="box-none">
                  <MapKindButton />
                </View>
              )}
            </View>
            {/* The map's kind (TASK-264): opposite the way back, or under
             * the banner that takes its row while running. */}
            {banner && <MapKindButton />}
            {compass}
          </View>
        )}
      </View>
      {active && (
        <View
          style={[styles.card, { paddingBottom: insets.bottom + space.md }]}
          testID="map-card"
        >
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.map.background,
  },
  map: {
    flex: 1,
  },
  top: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    gap: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
  },
  back: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  backText: {
    color: color.text,
    fontSize: fontSize.title,
  },
  // The rest of the row: the map's kind at its right end.
  end: {
    marginLeft: "auto",
  },
  errorBox: {
    flex: 1,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  card: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.surface,
  },
});
