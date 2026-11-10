import { Image, type ImageSourcePropType, StyleSheet } from "react-native";

import { TAB_ICON_SIZE } from "../tabs/TabBar";
import { color } from "../theme/tokens";

/**
 * The icons of the ski mode's tabs (TASK-429 part A, ADR-0357), from
 * Lucide (ISC, assets/ui/tabs/LICENSE-lucide.txt) as the bar's own:
 * «Today» a snowy mountain, «Days» a calendar, «Resorts» a cable car.
 * White, coloured by `tintColor`; the tab on screen has the bolder line.
 */
export const SKI_TAB_ICONS = {
  today: {
    off: require("../../assets/ui/tabs/mountain.png"),
    on: require("../../assets/ui/tabs/mountain-active.png"),
  },
  days: {
    off: require("../../assets/ui/tabs/calendar.png"),
    on: require("../../assets/ui/tabs/calendar-active.png"),
  },
  resorts: {
    off: require("../../assets/ui/tabs/cable-car.png"),
    on: require("../../assets/ui/tabs/cable-car-active.png"),
  },
} satisfies Record<string, { off: ImageSourcePropType; on: ImageSourcePropType }>;

export type SkiTabIconName = keyof typeof SKI_TAB_ICONS;

/**
 * The icon of a ski tab, for the bar's `face`: the bar draws its own
 * icons only from its four, and a face keeps it as it is. As the bar's:
 * faint and thin, or full and bold on the tab on screen.
 */
export function SkiTabIcon({
  name,
  selected,
}: {
  name: SkiTabIconName;
  selected: boolean;
}) {
  const icon = SKI_TAB_ICONS[name];
  return (
    <Image
      testID={`ski-tab-${name}-${selected ? "on" : "off"}`}
      source={selected ? icon.on : icon.off}
      style={[styles.icon, { tintColor: selected ? color.text : color.textFaint }]}
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
  },
});
