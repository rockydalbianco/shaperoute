import { type ReactNode, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { ActivitySheet } from "./ActivitySheet";

type Props = {
  /** The run as its card names it: the sheet's heading, and what a screen
   * reader says after «More». */
  name: string;
  /** What else the run offers, over «Delete»; mounted while the sheet is
   * open. */
  children?: ReactNode;
  /** The run goes, for good: asked for after a yes in the sheet. */
  onDelete: () => void;
};

/**
 * The «…» of a run of «My activities» (TASK-456), in the list and on the
 * run opened on the map: a small sheet with what is done to the run now
 * and then, so that «Delete» is not in sight on every card. «Delete» asks
 * first, in the sheet itself, with the words it always had; «Keep it»
 * closes the sheet.
 */
export function ActivityMenu({ name, children, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  // «Delete» was tapped: the sheet asks before the run goes.
  const [confirming, setConfirming] = useState(false);
  // What the sheet shows stays as it is while it goes down.
  const close = () => setOpen(false);
  return (
    <>
      <Tap
        style={styles.more}
        onPress={() => {
          setConfirming(false);
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={t("More")}
        accessibilityHint={name}
        hitSlop={space.sm}
        testID="activity-menu"
      >
        <Text style={styles.moreText}>…</Text>
      </Tap>
      <ActivitySheet visible={open} onClose={close} testID="activity-menu-sheet">
        {confirming ? (
          <>
            <Text style={styles.title} accessibilityRole="header">
              {t("Delete this run? It cannot be undone.")}
            </Text>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Choice
              label={t("Delete run")}
              onPress={() => {
                close();
                onDelete();
              }}
              danger
            />
            <Choice label={t("Keep it")} onPress={close} />
          </>
        ) : (
          <>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
              {name}
            </Text>
            {children}
            <Choice label={t("Delete")} onPress={() => setConfirming(true)} danger />
            <Choice label={t("Cancel")} onPress={close} />
          </>
        )}
      </ActivitySheet>
    </>
  );
}

function Choice({
  label,
  onPress,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Tap style={menuChoice.button} onPress={onPress} accessibilityRole="button">
      <Text style={[menuChoice.text, danger && styles.danger]}>{label}</Text>
    </Tap>
  );
}

/** A row of the sheet, for what a caller puts in it («Send to a friend»):
 * the same look as «Delete» and «Cancel». */
export const menuChoice = StyleSheet.create({
  button: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  text: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  // As the «…» of a post in «Feed» (ReportMenu.tsx).
  more: {
    minWidth: MIN_TAP_SIZE,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: {
    color: color.textMuted,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  title: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  name: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  danger: {
    color: color.error,
  },
});
