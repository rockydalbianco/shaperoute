import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { selectionFeel } from "../haptics/haptics";
import { countLabel } from "../messages/MessagesRow";
import {
  color,
  fontSize,
  fontWeight,
  glass,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { tabName, tourPart } from "../tour/tourParts";
import { Glass } from "../ui/Glass";
import { fadeTo, springTo } from "../ui/motion";
import { Tap } from "../ui/Tap";
import { useGlassMode } from "../ui/useGlassMode";
import { useReduceMotion } from "../ui/useReduceMotion";

/** The icons of the bar, from Lucide (ISC, assets/ui/tabs/LICENSE-lucide.txt):
 * white, coloured by `tintColor`; the tab on screen has the bolder line. */
export const TAB_ICONS = {
  house: {
    off: require("../../assets/ui/tabs/house.png"),
    on: require("../../assets/ui/tabs/house-active.png"),
  },
  pencil: {
    off: require("../../assets/ui/tabs/pencil.png"),
    on: require("../../assets/ui/tabs/pencil-active.png"),
  },
  send: {
    off: require("../../assets/ui/tabs/send.png"),
    on: require("../../assets/ui/tabs/send-active.png"),
  },
  search: {
    off: require("../../assets/ui/tabs/search.png"),
    on: require("../../assets/ui/tabs/search-active.png"),
  },
} satisfies Record<string, { off: ImageSourcePropType; on: ImageSourcePropType }>;

export type TabIcon = keyof typeof TAB_ICONS;

/** The side of an icon of the bar, in points. */
export const TAB_ICON_SIZE = 26;
/** How tall the bar is over the home indicator. */
export const TAB_BAR_HEIGHT = 50;

/**
 * The bar is a capsule of glass floating over the foot of the app
 * (TASK-469, ADR-0383): this far from the sides of the screen, this tall,
 * and lifted from the bottom edge by the home indicator's room less
 * `TAB_GLASS_SINK`, at least `space.sm`. On a phone with a home indicator
 * the band it floats in is as tall as the bar was.
 */
export const TAB_BAR_INSET = space.lg;
export const TAB_GLASS_HEIGHT = TAB_BAR_HEIGHT + space.sm;
export const TAB_GLASS_SINK = space.md;

/** The soft capsule behind the tab on screen (TASK-388), in points. */
export const TAB_CAPSULE_WIDTH = 64;
export const TAB_CAPSULE_HEIGHT = TAB_GLASS_HEIGHT - space.md;

/**
 * Where the capsule stands under tab `index`, from the glass's left edge:
 * the tabs share the glass, not the screen.
 */
export function tabCapsuleX(index: number, width: number, count: number): number {
  const slot = (width - 2 * TAB_BAR_INSET) / Math.max(count, 1);
  return index * slot + (slot - TAB_CAPSULE_WIDTH) / 2;
}

/** How far the glass floats over the bottom edge, for the phone's insets. */
export function tabGlassLift(bottomInset: number): number {
  return Math.max(bottomInset - TAB_GLASS_SINK, space.sm);
}
/** How small an icon gets under the finger. */
export const TAB_PRESS_SCALE = 0.9;
/** How far the icon taking its tab rises, in points. */
export const TAB_ICON_RISE = 1.5;

export type BarTab = {
  /** The page's name: the tour finds the tab by it. */
  title: string;
  /** What the screen reader says: the name, with what waits in it. */
  label: string;
  /** Its icon, or `face`: the profile's picture (TASK-367). */
  icon?: TabIcon;
  face?: (selected: boolean) => ReactNode;
  /** A red number over the icon, when more than 0. */
  count?: number;
};

type Props = {
  tabs: readonly BarTab[];
  /** The tab of the page on screen. */
  page: number;
  onTab: (index: number) => void;
  /**
   * How far a finger has slid the pages from the page at rest, in pages,
   * signed (+1: the whole next page): the capsule follows it. It comes back
   * to 0 in the same commit that brings the new `page`.
   */
  drag?: Animated.AnimatedInterpolation<number> | Animated.Value;
};

/**
 * The tab bar at the foot of the app (TASK-367, ADR-0311), as Instagram's:
 * one icon a page, no words, over the home indicator. The page on screen is
 * told by the bolder line, by light and by a soft capsule behind it, never
 * by the route's yellow. The capsule glides to a new tab on the spring
 * `glide`, which never passes its mark (TASK-388, ADR-0329); with «Reduce
 * Motion» it fades in where it goes, nothing slides.
 *
 * A touched tab sets the capsule and its icon off at the touch, before the
 * app builds the page: the springs run on the UI thread while JS builds it,
 * so a heavy page («Feed», «Explore» the first time) no longer holds them
 * back.
 */
export function TabBar({ tabs, page, onTab, drag }: Props) {
  const insets = useSafeAreaInsets();
  const still = useReduceMotion();
  const mode = useGlassMode();
  const { width } = useWindowDimensions();
  const count = tabs.length;
  const slot = (width - 2 * TAB_BAR_INSET) / Math.max(count, 1);
  const lift = tabGlassLift(insets.bottom);
  const band = Math.max(
    TAB_BAR_HEIGHT + insets.bottom,
    TAB_GLASS_HEIGHT + lift + space.xs,
  );

  // The capsule's tab, as a number: 2.5 is half way from the third to the fourth.
  const [at] = useState(() => new Animated.Value(page));
  const [shown] = useState(() => new Animated.Value(1));
  // Each icon's light, 1 lit: made the first time it is asked for.
  const [lights] = useState(() => new Map<number, Animated.Value>());
  function lightOf(index: number): Animated.Value {
    let light = lights.get(index);
    if (light === undefined) {
      light = new Animated.Value(index === page ? 1 : 0);
      lights.set(index, light);
    }
    return light;
  }

  // Where the finger last had the pages: a page reached by sliding is where
  // the capsule already is, and the spring has nothing to do.
  const dragged = useRef(0);
  useEffect(() => {
    if (!drag) {
      return;
    }
    const id = drag.addListener(({ value }) => {
      dragged.current = value;
    });
    return () => drag.removeListener(id);
  }, [drag]);

  // The tab the capsule goes to or stands on, and the icon lit or lighting.
  const heading = useRef(page);
  const lit = useRef(page);

  function moveTo(index: number, from?: number) {
    heading.current = index;
    if (still) {
      at.setValue(index);
      shown.setValue(0);
      fadeTo(shown, 1).start();
      return;
    }
    if (from === undefined) {
      springTo(at, index, "glide").start();
      return;
    }
    // From where a finger left it: round the bar if that is nearer, and
    // back to the tab's own number at rest.
    const to = index + Math.round((from - index) / count) * count;
    at.setValue(from);
    springTo(at, to, "glide").start(({ finished }) => {
      if (finished && to !== index) {
        at.setValue(index);
      }
    });
  }

  function lightUp(index: number) {
    const was = lit.current;
    if (was === index) {
      return;
    }
    lit.current = index;
    const turn = (light: Animated.Value, to: number) =>
      (still ? fadeTo(light, to) : springTo(light, to, "glide")).start();
    turn(lightOf(was), 0);
    turn(lightOf(index), 1);
  }

  const before = useRef(page);
  // In the commit that brings the page, so it never shows a frame behind.
  useLayoutEffect(() => {
    const from = before.current;
    if (from === page) {
      return;
    }
    before.current = page;
    lightUp(page);
    // A finger brought the pages a whole page or more: the capsule is there.
    const slid = Math.round(dragged.current);
    dragged.current = 0;
    if (slid !== 0) {
      const start = (((from + slid) % count) + count) % count;
      at.setValue(start);
      heading.current = start;
    }
    // Unless the touch has sent it already.
    if (heading.current !== page) {
      moveTo(page);
    }
  });

  function touched(index: number) {
    // A light buzz for a new tab only, not for every touch.
    selectionFeel();
    const from = dragged.current === 0 ? undefined : heading.current + dragged.current;
    moveTo(index, from);
    lightUp(index);
    // The app may keep its page («Messages» for nobody signed in, from the
    // profile): once it has answered, the capsule goes back.
    setTimeout(() => {
      if (before.current !== heading.current) {
        lightUp(before.current);
        moveTo(before.current);
      }
    }, 0);
  }

  // Two more capsules a whole bar away on either side: sliding from the
  // last page round to the first, one leaves at the right edge as the
  // other comes in at the left.
  const moves = useMemo(() => {
    const where = drag ? Animated.add(at, drag) : at;
    const offset = tabCapsuleX(0, width, count);
    return [-1, 0, 1].map((round) =>
      where.interpolate({
        inputRange: [0, 1],
        outputRange: [
          offset + round * count * slot,
          offset + (round * count + 1) * slot,
        ],
      }),
    );
  }, [at, drag, slot, count, width]);

  return (
    <View
      style={[styles.bar, { height: band }]}
      accessibilityRole="tablist"
      testID="tab-bar"
    >
      <Glass testID="tab-glass" mode={mode} style={[styles.glass, { bottom: lift }]}>
        <View style={styles.capsules} pointerEvents="none">
          {moves.map((translateX, round) => (
            <Animated.View
              key={round}
              testID={round === 1 ? "tab-capsule" : `tab-capsule-${round}`}
              style={[
                styles.capsule,
                mode === "glass" ? styles.capsuleOnGlass : null,
                { opacity: shown, transform: [{ translateX }] },
              ]}
            />
          ))}
        </View>
        {tabs.map((tab, index) => {
          const selected = index === page;
          return (
            // The tour shows the tab: a plain view, which it can measure.
            <View
              key={tab.title}
              ref={tourPart(tabName(tab.title))}
              collapsable={false}
              style={styles.slot}
            >
              <Tap
                style={styles.tab}
                pressScale={TAB_PRESS_SCALE}
                settle="glide"
                onPress={() => {
                  if (index !== page) {
                    touched(index);
                  }
                  onTab(index);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={tab.label}
              >
                <Glyph
                  tab={tab}
                  selected={selected}
                  on={lightOf(index)}
                  still={still}
                />
                {(tab.count ?? 0) > 0 && (
                  <View style={styles.count}>
                    <Text style={styles.countText}>{countLabel(tab.count ?? 0)}</Text>
                  </View>
                )}
              </Tap>
            </View>
          );
        })}
      </Glass>
    </View>
  );
}

type GlyphProps = {
  tab: BarTab;
  selected: boolean;
  /** Its light, moved by the bar: 1 lit. */
  on: Animated.Value;
  still: boolean;
};

/**
 * A tab's icon: taking its tab it rises a point and a half and its outline
 * gives way to the bolder line in a cross fade; with «Reduce Motion» only
 * the fade.
 */
function Glyph({ tab, selected, on, still }: GlyphProps) {
  const rise = on.interpolate({
    inputRange: [0, 1],
    outputRange: [0, still ? 0 : -TAB_ICON_RISE],
  });
  if (tab.face) {
    return (
      <Animated.View style={{ transform: [{ translateY: rise }] }}>
        {tab.face(selected)}
      </Animated.View>
    );
  }
  if (!tab.icon) {
    return null;
  }
  const lit = on.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const unlit = on.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  return (
    <Animated.View style={[styles.icon, { transform: [{ translateY: rise }] }]}>
      <Animated.Image
        testID={`tab-icon-off-${tab.title}`}
        source={TAB_ICONS[tab.icon].off}
        style={[styles.layer, { tintColor: color.textMuted, opacity: unlit }]}
      />
      <Animated.Image
        testID={`tab-icon-on-${tab.title}`}
        source={TAB_ICONS[tab.icon].on}
        style={[styles.layer, { tintColor: color.text, opacity: lit }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // The band at the foot of the app, the page's background; the glass
  // floats in it (TASK-469, ADR-0383).
  bar: {
    backgroundColor: color.background,
  },
  glass: {
    position: "absolute",
    left: TAB_BAR_INSET,
    right: TAB_BAR_INSET,
    height: TAB_GLASS_HEIGHT,
    flexDirection: "row",
  },
  // What passes the glass's edges (a capsule going round) is cut.
  capsules: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    borderRadius: radius.pill,
  },
  capsule: {
    position: "absolute",
    top: (TAB_GLASS_HEIGHT - TAB_CAPSULE_HEIGHT) / 2,
    left: 0,
    width: TAB_CAPSULE_WIDTH,
    height: TAB_CAPSULE_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  // On the see-through glass the capsule is the text, faint: never yellow.
  capsuleOnGlass: {
    backgroundColor: glass.selected,
  },
  slot: {
    flex: 1,
  },
  tab: {
    height: TAB_GLASS_HEIGHT,
    minWidth: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
  },
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
  },
  count: {
    position: "absolute",
    top: space.xs,
    left: "50%",
    marginLeft: space.sm,
    minWidth: space.lg + space.xs / 2,
    height: space.lg + space.xs / 2,
    paddingHorizontal: space.xs,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.background,
    backgroundColor: color.badge,
  },
  countText: {
    color: color.onBadge,
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
  },
});
