import { Image, type ImageSourcePropType, StyleSheet } from "react-native";

import { TAB_ICON_SIZE } from "../tabs/TabBar";
import { color } from "../theme/tokens";

/**
 * The icons of the training mode's tabs (TASK-490 part A, ADR-0398), at the
 * lines of the bar's Lucide icons (1.8 and 2.6 on 24): «Today» a dumbbell,
 * drawn with the Mac's Swift as the ski mode's were, «Workouts» Lucide's
 * list (part E: no more the calendar of the ski mode's «Days»), «Food»
 * Lucide's utensils (part D), both drawn the same way. White, coloured by
 * `tintColor`.
 */
export const TRAINING_TAB_ICONS = {
  today: {
    off: require("../../assets/ui/tabs/dumbbell.png"),
    on: require("../../assets/ui/tabs/dumbbell-active.png"),
  },
  workouts: {
    off: require("../../assets/ui/tabs/list.png"),
    on: require("../../assets/ui/tabs/list-active.png"),
  },
  food: {
    off: require("../../assets/ui/tabs/utensils.png"),
    on: require("../../assets/ui/tabs/utensils-active.png"),
  },
} satisfies Record<string, { off: ImageSourcePropType; on: ImageSourcePropType }>;

export type TrainingTabIconName = keyof typeof TRAINING_TAB_ICONS;

/** The icon of a training tab, for the bar's `face`, as the ski mode's. */
export function TrainingTabIcon({
  name,
  selected,
}: {
  name: TrainingTabIconName;
  selected: boolean;
}) {
  const icon = TRAINING_TAB_ICONS[name];
  return (
    <Image
      testID={`training-tab-${name}-${selected ? "on" : "off"}`}
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
