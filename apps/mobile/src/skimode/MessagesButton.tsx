import { Image, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { countLabel } from "../messages/MessagesRow";
import { TAB_ICON_SIZE, TAB_ICONS } from "../tabs/TabBar";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";

type Props = {
  /** The conversations with news and the requests waiting. */
  waiting: number;
  onPress: () => void;
};

/**
 * «Messages» in the header of the ski mode (TASK-429, ADR-0357): its tab
 * goes to the ski pages, so it is a button beside the sport, with the icon
 * and the red number its tab had. A touch opens the conversations over the
 * app.
 */
export function MessagesButton({ waiting, onPress }: Props) {
  return (
    <Tap
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        waiting > 0 ? t("Messages, {count} waiting", { count: waiting }) : t("Messages")
      }
      testID="ski-messages"
    >
      <Image source={TAB_ICONS.send.off} style={styles.icon} />
      {waiting > 0 && (
        <View style={styles.count} testID="ski-messages-count">
          <Text style={styles.countText}>{countLabel(waiting)}</Text>
        </View>
      )}
    </Tap>
  );
}

// As the bell beside it (`../bell/BellButton`): the same size, the same red
// number.
const styles = StyleSheet.create({
  button: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    tintColor: color.text,
  },
  count: {
    position: "absolute",
    top: 0,
    left: "50%",
    marginLeft: space.xs,
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
