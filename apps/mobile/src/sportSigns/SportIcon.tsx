import type { ReactNode } from "react";
import type {
  AccessibilityRole,
  ImageSourcePropType,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import { Image, StyleSheet, Text, View } from "react-native";

import { color, space } from "../theme/tokens";
import { POOL_ICON, sportIconOf } from "./sportIcons";

type Props = {
  /** The sport's activity ("running", "skiing"…), or a sign of its own. */
  activity?: string;
  source?: ImageSourcePropType;
  /** The side, in points. */
  size: number;
  /** A token: `color.text` by default. */
  tint?: string;
  /**
   * What VoiceOver says when the sign stands alone (the sport's name);
   * none where a name beside it or the button around it says it.
   */
  label?: string;
  testID?: string;
};

/**
 * A sport's line sign (TASK-510): one way of drawing it everywhere, in the
 * colours of the tokens, never its meaning by colour alone.
 */
export function SportIcon({
  activity,
  source,
  size,
  tint = color.text,
  label,
  testID,
}: Props) {
  return (
    <Image
      source={source ?? sportIconOf(activity)}
      style={{ width: size, height: size, tintColor: tint }}
      accessible={label !== undefined}
      accessibilityRole={label !== undefined ? "image" : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label !== undefined ? "yes" : "no-hide-descendants"}
      testID={testID ?? defaultTestID(activity, source)}
    />
  );
}

/** «sport-icon-skiing», «sport-icon-pool»: how tests find a sign. */
function defaultTestID(
  activity: string | undefined,
  source: ImageSourcePropType | undefined,
): string | undefined {
  if (source === POOL_ICON) {
    return "sport-icon-pool";
  }
  return source === undefined && activity !== undefined
    ? `sport-icon-${activity}`
    : undefined;
}

type LineProps = {
  activity?: string;
  source?: ImageSourcePropType;
  /** The sign's side: as the words' size, or a little more. */
  size: number;
  /** The words' colour, as a token: the sign takes it too. */
  tint: string;
  textStyle: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
  children: ReactNode;
};

/**
 * A sport's sign before a line of words, «[dumbbell] Gym» (TASK-510): in
 * place of «🏋️ Gym» written as one text. The sign is not read; the words are.
 */
export function SportLine({
  activity,
  source,
  size,
  tint,
  textStyle,
  style,
  accessibilityRole,
  testID,
  children,
}: LineProps) {
  return (
    <View style={[lineStyles.row, style]}>
      <SportIcon activity={activity} source={source} size={size} tint={tint} />
      <Text style={textStyle} accessibilityRole={accessibilityRole} testID={testID}>
        {children}
      </Text>
    </View>
  );
}

const lineStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
});
