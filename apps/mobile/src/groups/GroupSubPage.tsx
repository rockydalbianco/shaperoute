import type { Person } from "@shaperoute/shared-types";
import type { ReactNode } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { personPhotoUri } from "../api/people";
import { t } from "../i18n";
import { Avatar } from "../profile/Avatar";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useBackCloses } from "../ui/backLayers";
import { useEdgeBack } from "../ui/EdgeBack";
import { Tap } from "../ui/Tap";

/** The side of a member's picture in a list. */
const FACE = 32;

/**
 * A page over a group's page (TASK-495 part B): the members, the requests,
 * the invites. «←» and the edge go back to the group.
 */
export function GroupSubPage({
  title,
  onBack,
  testID,
  children,
}: {
  title: string;
  onBack: () => void;
  testID: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  useBackCloses(true, onBack);
  const edge = useEdgeBack(onBack, true);
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.screen, edge.style]}
      {...edge.handlers}
      testID={testID}
    >
      {edge.shade}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.lg,
            paddingBottom: insets.bottom + space.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <Tap
            style={styles.back}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={t("Back")}
          >
            <Text style={styles.backText}>←</Text>
          </Tap>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

/** A member in a list: the picture and the name open the profile; what is
 * on the right is the page's. */
export function PersonLine({
  person,
  note,
  onOpen,
  children,
}: {
  person: Person;
  /** A word under the name: the role. */
  note?: string | null;
  onOpen: (person: Person) => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.line}>
      <Tap
        style={styles.person}
        onPress={() => onOpen(person)}
        accessibilityRole="button"
        accessibilityLabel={t("{name}'s profile", { name: person.username })}
      >
        <Avatar name={person.username} size={FACE} photo={personPhotoUri(person)} />
        <View style={styles.names}>
          <Text style={styles.name} numberOfLines={1}>
            {person.username}
          </Text>
          {note !== undefined && note !== null && (
            <Text style={styles.note}>{note}</Text>
          )}
        </View>
      </Tap>
      {children}
    </View>
  );
}

/** A small button of a list's line. */
export function LineButton({
  label,
  onPress,
  disabled = false,
  danger = false,
  accessibilityLabel,
  testID,
}: {
  label: string;
  /** What a screen reader says, when not the label: «More» for «⋯». */
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  testID?: string;
}) {
  return (
    <Tap
      style={[styles.button, disabled && styles.off]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Text
        style={[styles.buttonText, danger && styles.danger, disabled && styles.off]}
      >
        {label}
      </Text>
    </Tap>
  );
}

export const subStyles = StyleSheet.create({
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
  empty: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    paddingLeft: FACE + space.sm,
  },
});

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
  },
  content: {
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  back: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: color.text,
    fontSize: fontSize.title,
  },
  title: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  person: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  names: {
    flex: 1,
  },
  name: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  off: {
    opacity: 0.5,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  danger: {
    color: color.error,
  },
});
