import { StyleSheet, Text } from "react-native";

import { t } from "../i18n";
import { color, fontSize, space } from "../theme/tokens";
import { sizeText } from "./sizeText";

type Props = {
  /** The bytes of the first maps of the phone while they download
   * (`usePhoneZones`), null when there are none. */
  bytes: number | null;
};

/**
 * The line over «Draw route» while the phone downloads its first maps
 * (TASK-214, part C): the text and its place are the user's choices of
 * 2026-10-03 and 2026-10-04. Nothing for the downloads after them.
 */
export function ZoneNotice({ bytes }: Props) {
  if (bytes === null) {
    return null;
  }
  return (
    <Text style={styles.notice} accessibilityLiveRegion="polite">
      {t("Downloading the maps of your area ({size}) so routes work without signal.", {
        size: sizeText(bytes),
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  notice: {
    marginBottom: space.sm,
    color: color.textMuted,
    fontSize: fontSize.small,
    textAlign: "center",
  },
});
