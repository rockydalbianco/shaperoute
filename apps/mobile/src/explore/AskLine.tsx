import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, font, fontSize, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";

type Props = {
  open: boolean;
  onToggle: () => void;
  /** «Ask for a route» itself, shown under the line while open. */
  children: ReactNode;
};

/**
 * «Ask for a route» as one line (TASK-420, the user's choice of 2026-11-10):
 * the page goes on with every drawing of the catalog, so the form is not at
 * its foot any more; it opens under this line, and closes with it.
 */
export function AskLine({ open, onToggle, children }: Props) {
  return (
    <View style={styles.block}>
      <Tap
        style={styles.line}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t("Ask for a route")}
        testID="ask-line"
      >
        <View style={styles.words}>
          <Text style={styles.title}>{t("Ask for a route")}</Text>
          <Text style={styles.detail} numberOfLines={1}>
            {t("Famous places, best views, food… in any city")}
          </Text>
        </View>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>{open ? "↑" : "→"}</Text>
        </View>
      </Tap>
      {open && children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.sm,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.xl,
    backgroundColor: color.surface,
  },
  words: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...font.cardTitle,
    color: color.text,
  },
  detail: {
    ...font.detail,
    color: color.textMuted,
  },
  arrow: {
    width: MIN_TAP_SIZE - space.sm,
    height: MIN_TAP_SIZE - space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    color: color.text,
    fontSize: fontSize.heading,
  },
});
