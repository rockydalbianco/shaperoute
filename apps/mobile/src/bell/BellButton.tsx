import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { t } from "../i18n";
import { countLabel } from "../messages/MessagesRow";
import { segmentTrackFace } from "../screens/Segmented";
import { TAB_ICON_SIZE } from "../tabs/TabBar";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { glassRaise } from "../ui/glassRaise";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";
import { Tap } from "../ui/Tap";
import { useBell } from "./bellDoor";

const BELL = require("../../assets/ui/tabs/bell.png");

type Shadows = Exclude<ViewStyle["boxShadow"], string | undefined>;

/** The shadows of a face, as a list: none when it has none. */
function shadowsOf(face: ViewStyle): Shadows {
  return Array.isArray(face.boxShadow) ? (face.boxShadow as Shadows) : [];
}

/**
 * A round button of the header on glass (TASK-469 A5, ADR-0383, «Capsula»):
 * the glass laid with its rim and light (`segmentTrackFace`), raised out of
 * the page (`glassRaise`), and the 1 pt `borderStrong` edge every control
 * keeps to be found in sunlight (TASK-086). With «Reduce Transparency» the
 * opaque background; with «Increase Contrast» the strong edge inside too.
 */
export function headerGlass(mode: GlassMode): ViewStyle {
  const laid = segmentTrackFace(mode);
  const raised = glassRaise(mode);
  return {
    ...laid,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.pill,
    boxShadow: [...shadowsOf(laid), ...shadowsOf(raised)],
  };
}

/**
 * The bell of the header (TASK-367 part C, ADR-0311), as Instagram's heart:
 * a red number with the unread lines, and a touch opens the list. Not there
 * while there is no list to open: no account, or a server without it
 * («Aspetta la lista vera», the user's choice: never an empty page).
 */
export function BellButton() {
  const { unread, open } = useBell();
  const mode = useGlassMode();
  if (unread === null) {
    return null;
  }
  return (
    <Tap
      style={[styles.bell, headerGlass(mode)]}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0
          ? t("Notifications, {count} new", { count: countLabel(unread) })
          : t("Notifications")
      }
      testID="bell"
    >
      <Image source={BELL} style={styles.icon} />
      {unread > 0 && (
        <View style={styles.count} testID="bell-count">
          <Text style={styles.countText}>{countLabel(unread)}</Text>
        </View>
      )}
    </Tap>
  );
}

// As the tabs of the bar: the same icon size, the same red number; in a
// circle of glass (TASK-469 A5).
const styles = StyleSheet.create({
  bell: {
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
