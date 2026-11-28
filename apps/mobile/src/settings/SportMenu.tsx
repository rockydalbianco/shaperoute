import { useContext, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { t } from "../i18n";
import { NUTRITION_ON } from "../nutrition/nutritionOn";
import { NutritionFamily } from "../nutrition/NutritionTile";
import { isSkiMode } from "../skimode/skiMode";
import { SportIcon } from "../sportSigns/SportIcon";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { isTrainingMode } from "../trainingmode/trainingMode";
import { Hairline } from "../ui/Hairline";
import { Tap } from "../ui/Tap";
import { runActivityOf, type Sport, type SportOption } from "./sport";
import { groupSports } from "./sportFamilies";

/** The panel's gap from the window's sides, and the gap between its tiles. */
const SIDE = space.lg;
const GAP = space.sm;
/** Inside the panel, its tiles' gap from its edges. */
const INSIDE = space.md;
/** The panel's edge, on each side. */
const EDGE = 1;
const NO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };
/** Tiles to a row (TASK-512, ADR-0420: the user's choice, «three to a row»). */
export const PER_ROW = 3;

/** A tile's width for a window `width` wide: three to a row, filling the
 * panel inside its edge and its padding. */
export function tileWidth(width: number): number {
  return rowTileWidth(width - SIDE * 2 - EDGE * 2);
}

/** A tile's width for a panel whose inside (edge left out) is `inner`
 * wide: three tiles and their gaps, a point to spare so rounding never
 * pushes the last to the next row. */
export function rowTileWidth(inner: number): number {
  return Math.max(
    0,
    Math.floor((inner - INSIDE * 2 - GAP * (PER_ROW - 1) - 1) / PER_ROW),
  );
}

/** How tall the panel may be, hung at `top` in a window `height` tall
 * above a bottom inset `bottom`: what does not fit scrolls inside it. */
export function panelMaxHeight(height: number, top: number, bottom: number): number {
  return Math.max(MIN_TAP_SIZE * 4, height - top - bottom - space.lg);
}

/** A tile's height for its width: a little less, so a row stays low. */
export function tileHeight(size: number): number {
  return Math.round(size * 0.8);
}

/** Where the header of the pages puts the sport button's bottom, plus the
 * panel's gap under it: where the panel hangs when no button says. */
export function headerHang(insetTop: number): number {
  return insetTop + space.sm + MIN_TAP_SIZE + space.xs;
}

type Props = {
  open: boolean;
  /** The sports of the menu. */
  sports: readonly SportOption[];
  /** The sport chosen now: its tile is ticked. */
  chosen: Sport;
  onChoose: (sport: Sport) => void;
  onClose: () => void;
  /** Where the panel hangs, from the window's top; under the header's
   * sport button when not given. */
  top?: number | null;
};

/**
 * The sport panel (TASK-205, ADR-0165; compact since TASK-512, ADR-0420):
 * the sports by family (on foot, on wheels, on the water, on snow, then
 * the rest), small tiles three to a row, so nearly all of them are seen at
 * once. Opened by the header's sport button and by «Sport» in «Settings»,
 * so the two choose the same way. A sport not ready says «Soon».
 */
export function SportMenu({ open, sports, chosen, onChoose, onClose, top }: Props) {
  // The panel's inside as laid out: until then, as the window says.
  const [inner, setInner] = useState<number | null>(null);
  // «Settings» may be shown with no safe area around it (its tests): no inset.
  const insets = useContext(SafeAreaInsetsContext) ?? NO_INSETS;
  const { width, height } = useWindowDimensions();
  const hang = top ?? headerHang(insets.top);
  const maxHeight = panelMaxHeight(height, hang, insets.bottom);
  const tile = inner === null ? tileWidth(width) : rowTileWidth(inner);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* A tap anywhere else closes the panel and changes nothing; the
          screen reader closes it with the panel's own «Close». */}
      <Pressable
        testID="sport-backdrop"
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        onPress={onClose}
        accessible={false}
        importantForAccessibility="no"
      />
      <View
        testID="sport-panel"
        style={[styles.panel, { top: hang, maxHeight }]}
        accessibilityRole="radiogroup"
        accessibilityLabel={t("Sport")}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("Sport")}</Text>
          <Pressable
            style={styles.close}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("Close")}
          >
            <Text style={styles.closeMark}>✕</Text>
          </Pressable>
        </View>
        <ScrollView
          testID="sport-scroll"
          onLayout={(event) => setInner(event.nativeEvent.layout.width)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* In the ski mode (TASK-429, ADR-0357) or the training mode
              (TASK-490, ADR-0398), how to leave it. */}
          {(isSkiMode(chosen) || isTrainingMode(chosen)) && (
            <View
              style={styles.mode}
              accessible
              testID={isSkiMode(chosen) ? "sport-ski-mode" : "sport-training-mode"}
            >
              <Text style={styles.familyTitle}>
                {isSkiMode(chosen) ? t("Ski mode") : t("Training mode")}
              </Text>
              <Text style={styles.modeLine}>
                {t("Choose another sport to go back to MuW as always.")}
              </Text>
              <Hairline style={styles.modeRule} />
            </View>
          )}
          {groupSports(sports).map((group) => (
            <View
              key={group.family}
              style={styles.family}
              testID={`sport-family-${group.family}`}
            >
              <Text style={styles.familyTitle} accessibilityRole="header">
                {t(group.title)}
              </Text>
              <View style={styles.grid}>
                {group.sports.map((option) => (
                  <SportTile
                    key={option.id}
                    option={option}
                    size={tile}
                    chosen={option.id === chosen}
                    onChoose={() => onChoose(option.id)}
                  />
                ))}
              </View>
            </View>
          ))}
          {/* «Nutrition» is not a sport: it opens its page (TASK-489,
              ADR-0397). Off until the native build that reads Health. */}
          {NUTRITION_ON && <NutritionFamily size={tile} />}
        </ScrollView>
      </View>
    </Modal>
  );
}

type TileProps = {
  option: SportOption;
  /** The tile's width, in points; its height follows. */
  size: number;
  chosen: boolean;
  onChoose: () => void;
};

/** One sport of the panel: its line sign (TASK-510), its name under it; the one chosen
 * with a stronger edge and a ✓, one not ready with «Soon». */
function SportTile({ option, size, chosen, onChoose }: TileProps) {
  const box = { width: size, minHeight: tileHeight(size) };
  if (!option.ready) {
    return (
      <View
        testID={`sport-tile-${option.id}`}
        style={[styles.tile, styles.tileSoon, box]}
        accessible
        accessibilityLabel={t("{sport}, coming soon", { sport: t(option.name) })}
      >
        <SportIcon
          activity={runActivityOf(option.id)}
          size={TILE_ICON}
          tint={color.textMuted}
        />
        <Text style={styles.tileName} numberOfLines={2}>
          {t(option.name)}
        </Text>
        <Text style={styles.soon}>{t("Soon")}</Text>
      </View>
    );
  }
  // Choosing it changes the app (TASK-429, TASK-490): the screen reader
  // says so; on the small tile the line is left out (TASK-512).
  const modeLine = isSkiMode(option.id)
    ? t("Turns MuW into your ski app")
    : isTrainingMode(option.id)
      ? t("Turns MuW into your training app")
      : undefined;
  return (
    // It answers the finger through Tap, as the app's other controls.
    <Tap
      testID={`sport-tile-${option.id}`}
      style={[styles.tile, box, chosen && styles.tileChosen]}
      onPress={onChoose}
      accessibilityRole="radio"
      // One name for the tile: the sign is not read on its own.
      accessibilityLabel={t(option.name)}
      accessibilityHint={modeLine}
      accessibilityState={{ checked: chosen }}
    >
      {chosen && <Text style={styles.check}>✓</Text>}
      <SportIcon activity={runActivityOf(option.id)} size={TILE_ICON} />
      <Text style={styles.tileName} numberOfLines={2}>
        {t(option.name)}
      </Text>
    </Tap>
  );
}

/** The side of a tile's sign, as the emoji it took the place of. */
const TILE_ICON = 28;

// The panel as a card of «Settings», its tiles neutral: the yellow belongs
// to the route (docs/UI.md, «Il tema»).
const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: color.scrim,
    opacity: 0.35,
  },
  panel: {
    position: "absolute",
    left: SIDE,
    right: SIDE,
    borderRadius: radius.xl,
    borderWidth: EDGE,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: INSIDE,
    paddingRight: space.xs,
    paddingTop: space.xs,
  },
  title: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
  },
  close: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  closeMark: {
    color: color.textMuted,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  content: {
    gap: space.md,
    paddingHorizontal: INSIDE,
    paddingBottom: INSIDE,
  },
  family: {
    gap: space.sm,
  },
  familyTitle: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    paddingHorizontal: space.xs,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceRaised,
  },
  tileChosen: {
    borderWidth: 2,
    borderColor: color.text,
  },
  tileSoon: {
    backgroundColor: color.surface,
  },
  tileName: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    textAlign: "center",
  },
  check: {
    position: "absolute",
    top: space.xs,
    right: space.sm,
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  mode: {
    gap: space.xs / 2,
  },
  modeLine: {
    color: color.text,
    fontSize: fontSize.small,
  },
  modeRule: {
    marginTop: space.md,
  },
  soon: {
    color: color.textFaint,
    fontSize: fontSize.detail,
  },
});
