import { StyleSheet, Text } from "react-native";

import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { glassRaise } from "../ui/glassRaise";
import { Tap } from "../ui/Tap";
import { useGlassMode } from "../ui/useGlassMode";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

/**
 * A choice that is on or off (TASK-344): the tabs of the search, its
 * categories, the values of a filter. On, it is the route's yellow, as
 * every choice made in the app; off, a quiet outline. On the glass both
 * stand out of the page with a line of light and a short shadow (TASK-469
 * A4a); the colours stay.
 */
export function FilterChip({ label, selected, onPress, testID }: Props) {
  const mode = useGlassMode();
  return (
    <Tap
      style={[styles.chip, glassRaise(mode), selected && styles.selected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]} numberOfLines={1}>
        {label}
      </Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: MIN_TAP_SIZE - space.sm,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  selected: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  label: {
    ...font.small,
    color: color.text,
  },
  selectedLabel: {
    color: color.onAccent,
  },
});
