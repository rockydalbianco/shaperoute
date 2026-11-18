import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { isSkiMode } from "../skimode/skiMode";
import { Hairline } from "../ui/Hairline";
import { Tap } from "../ui/Tap";
import { saveSport, type Sport, SPORTS, type SportOption } from "./sport";
import { groupSports } from "./sportFamilies";
import { useSport } from "./useSport";

type Props = {
  /** The sports of the menu; the app's own unless a test says otherwise. */
  sports?: readonly SportOption[];
};

/** The panel's gap from the window's sides, and the gap between its tiles. */
const SIDE = space.lg;
const GAP = space.sm;
/** Inside the panel, its tiles' gap from its edges. */
const INSIDE = space.md;
/** The panel's edge, on each side. */
const EDGE = 1;

/** A tile's width for a window `width` wide: two to a row, filling the
 * panel inside its edge and its padding. */
export function tileWidth(width: number): number {
  return pairWidth(width - SIDE * 2 - EDGE * 2);
}

/** A tile's width for a panel whose inside (edge left out) is `inner`
 * wide: two tiles and their gap, a point to spare so rounding never
 * pushes the second to the next row. */
export function pairWidth(inner: number): number {
  return Math.max(0, Math.floor((inner - INSIDE * 2 - GAP - 1) / 2));
}

/** How tall the panel may be, hung at `top` in a window `height` tall
 * above a bottom inset `bottom`: what does not fit scrolls inside it. */
export function panelMaxHeight(height: number, top: number, bottom: number): number {
  return Math.max(MIN_TAP_SIZE * 4, height - top - bottom - space.lg);
}

/** A tile's height for its width. */
export function tileHeight(size: number): number {
  return Math.round(size * 0.78);
}

/**
 * The sport, at the left of the way to «Profile» (TASK-205, ADR-0165): the
 * emoji of the one chosen, and a tap opens the panel of «Settings»' sports
 * under it, as large tiles two to a row, by family (on foot, on wheels, on
 * the water, on snow, then the rest). The choice is the one of «Settings»
 * (saveSport), so the two always agree and «Draw» follows at once; a sport
 * not ready says «Soon».
 */
export function SportButton({ sports = SPORTS }: Props) {
  const sport = useSport();
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState<number | null>(null);
  // The panel's inside as laid out: until then, as the window says.
  const [inner, setInner] = useState<number | null>(null);
  const button = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const current = sports.find((option) => option.id === sport) ?? sports[0];

  function openMenu() {
    button.current?.measureInWindow((_x, y, _w, h) => setTop(y + h + space.xs));
    setOpen(true);
  }

  function choose(chosen: Sport) {
    saveSport(chosen);
    setOpen(false);
  }

  // Until the button says where it is: where the header of the pages puts it.
  const hang = top ?? insets.top + space.sm + MIN_TAP_SIZE + space.xs;
  const maxHeight = panelMaxHeight(height, hang, insets.bottom);
  const tile = inner === null ? tileWidth(width) : pairWidth(inner);

  return (
    <>
      <Pressable
        ref={button}
        style={styles.button}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={t("Sport, {sport}", { sport: t(current.name) })}
        accessibilityHint={t("Changes the sport")}
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.buttonEmoji}>{current.emoji}</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        {/* A tap anywhere else closes the panel and changes nothing; the
            screen reader closes it with the panel's own «Close». */}
        <Pressable
          testID="sport-backdrop"
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={() => setOpen(false)}
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
              onPress={() => setOpen(false)}
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
            {/* In the ski mode (TASK-429, ADR-0357), how to leave it. */}
            {isSkiMode(sport) && (
              <View style={styles.mode} accessible testID="sport-ski-mode">
                <Text style={styles.familyTitle}>{t("Ski mode")}</Text>
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
                      chosen={option.id === sport}
                      onChoose={() => choose(option.id)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

type TileProps = {
  option: SportOption;
  /** The tile's width, in points; its height follows. */
  size: number;
  chosen: boolean;
  onChoose: () => void;
};

/** One sport of the panel: its emoji large, its name under it; the one
 * chosen with a stronger edge and a ✓, one not ready with «Soon». */
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
        <Text style={styles.tileEmoji}>{option.emoji}</Text>
        <Text style={styles.tileName} numberOfLines={2}>
          {t(option.name)}
        </Text>
        <Text style={styles.soon}>{t("Soon")}</Text>
      </View>
    );
  }
  const skiMode = isSkiMode(option.id);
  return (
    // It answers the finger through Tap, as the app's other controls.
    <Tap
      testID={`sport-tile-${option.id}`}
      style={[styles.tile, box, chosen && styles.tileChosen]}
      onPress={onChoose}
      accessibilityRole="radio"
      // One name for the tile: the emoji is not read on its own.
      accessibilityLabel={t(option.name)}
      accessibilityHint={skiMode ? t("Turns MuW into your ski app") : undefined}
      accessibilityState={{ checked: chosen }}
    >
      {chosen && <Text style={styles.check}>✓</Text>}
      <Text style={styles.tileEmoji}>{option.emoji}</Text>
      <Text style={styles.tileName} numberOfLines={2}>
        {t(option.name)}
      </Text>
      {/* Choosing it changes the app (TASK-429): the tile says so. */}
      {skiMode && (
        <Text style={styles.tileLine} numberOfLines={2}>
          {t("Turns MuW into your ski app")}
        </Text>
      )}
    </Tap>
  );
}

// The button as the one of «Profile» (`../screens/ProfileLayer`); the panel
// as a card of «Settings», its tiles neutral: the yellow belongs to the route
// (docs/UI.md, «Il tema»).
const styles = StyleSheet.create({
  button: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonEmoji: {
    fontSize: fontSize.input + space.xs,
  },
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
    gap: space.lg,
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
    padding: space.sm,
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
  tileEmoji: {
    fontSize: fontSize.title + space.sm,
  },
  tileName: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    textAlign: "center",
  },
  tileLine: {
    color: color.textMuted,
    fontSize: fontSize.small,
    textAlign: "center",
  },
  check: {
    position: "absolute",
    top: space.sm,
    right: space.sm,
    color: color.text,
    fontSize: fontSize.input,
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
    fontSize: fontSize.small,
  },
});
