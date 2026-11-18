import { type ReactNode, useMemo, useState } from "react";
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import { mapCover, MapCoverContext } from "../map/mapCover";
import { MapKindButton } from "../map/MapKindButton";
import { color, fontSize, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { useBackCloses } from "../ui/backLayers";
import { MapError } from "./ChooseScreen";
import { FoldHandle, foldedAfter, upOrDown } from "./RunFoldedStrip";

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
  /**
   * The end of an activity (TASK-477): the card and «Save» and «Discard»
   * under it can be taller than the screen. Then the card stops under the
   * banner and scrolls, so that nothing falls under the bottom edge.
   */
  scrolls?: boolean;
  /**
   * The card at the end of an activity, folded (TASK-478 part b): with it,
   * the card that scrolls can be dragged down, or its handle touched, and
   * only this strip is left over the map. `open` opens the card again.
   * What the card holds stays as it was, the form of the post included.
   */
  endStrip?: (open: () => void) => ReactNode;
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
  scrolls = false,
  endStrip,
}: Props) {
  const insets = useSafeAreaInsets();
  // What lies over the top of the map (TASK-443): the map frames its
  // route clear of it. The map goes from side to side of the window; a
  // banner is as high as it turns out.
  const { width, height } = useWindowDimensions();
  const [rowHeight, setRowHeight] = useState<number | null>(null);
  const hasBanner = banner !== undefined && banner !== null;
  // Without a banner the row is the buttons': its height is not asked, so
  // the menu of the map's kind opening does not frame the map again.
  const bannerHeight = hasBanner ? (rowHeight ?? MIN_TAP_SIZE) : null;
  const hasCompass = compass !== undefined && compass !== null;
  // Android's «back» is the «←», where there is one: not during a run,
  // whose banner takes its place.
  useBackCloses(active && !hasBanner, onBack);
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
  // The card at the end folded to a strip (TASK-478 part b): open again at
  // the next end.
  const foldable = active && scrolls && endStrip !== undefined;
  const [folded, setFolded] = useState(false);
  const [wasFoldable, setWasFoldable] = useState(foldable);
  if (wasFoldable !== foldable) {
    setWasFoldable(foldable);
    setFolded(false);
  }
  const isFolded = foldable && folded;
  // Up or down on the handle or the strip, not in the card that scrolls:
  // there the finger scrolls.
  const drag = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, { dx, dy }) => upOrDown(dx, dy),
        onPanResponderRelease: (_event, { dx, dy }) =>
          setFolded((now) => foldedAfter(dx, dy, now)),
      }),
    [],
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
      {active && scrolls && (
        // At most as high as the screen under the banner's row: the rest
        // scrolls, «Save» at its foot included (TASK-477).
        <View
          style={[
            styles.card,
            styles.scrolling,
            { maxHeight: cardMaxHeight(height, insets.top, bannerHeight) },
          ]}
          testID="map-card"
        >
          {foldable && (
            <View {...drag.panHandlers} testID="map-card-fold">
              <FoldHandle folded={isFolded} onPress={() => setFolded(!isFolded)} />
              {isFolded && endStrip(() => setFolded(false))}
            </View>
          )}
          {isFolded && <View style={{ height: insets.bottom + space.md }} />}
          <ScrollView
            // Folded, the card is still there, hidden: what was chosen in
            // it is kept.
            style={[styles.scroll, isFolded && styles.hidden]}
            contentContainerStyle={{ paddingBottom: insets.bottom + space.md }}
            keyboardShouldPersistTaps="handled"
            testID="map-card-scroll"
          >
            {children}
          </ScrollView>
        </View>
      )}
      {active && !scrolls && (
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

/**
 * The highest the card goes at the end of an activity (TASK-477): the
 * window, less the safe area at the top, the banner's row and a gap under
 * it, so that the banner stays in sight.
 */
export function cardMaxHeight(
  windowHeight: number,
  insetTop: number,
  bannerHeight: number | null,
): number {
  return Math.max(
    0,
    windowHeight - insetTop - space.sm - (bannerHeight ?? MIN_TAP_SIZE) - space.sm,
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
  // The card that scrolls: its padding at the foot is the content's.
  scrolling: {
    paddingBottom: 0,
  },
  // As high as its content, up to the card's height: it shrinks to fit
  // the card, and what is left over scrolls.
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  hidden: {
    display: "none",
  },
});
