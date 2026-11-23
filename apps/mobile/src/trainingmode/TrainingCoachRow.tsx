import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

import type { CoachFetchers } from "../coach/coachData";
import { CoachPage } from "../coach/CoachPage";
import { tipText } from "../coach/tipText";
import { type CoachState, useCoach } from "../coach/useCoach";
import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import { useLanguage } from "../i18n/useLanguage";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/**
 * What the Coach's line says under «Coach»: the first tip's title when
 * there is one, else what the Coach reads («Based on your last 4 weeks»).
 * Null without an account: the Coach needs one (ADR-0399), so «Today»
 * shows no line, as it shows no body of the week.
 */
export function coachLine(state: CoachState, language: Language): string | null {
  if (state.kind === "signedOut") {
    return null;
  }
  if (state.kind === "ready" && state.tips.length > 0) {
    return tipText(state.tips[0], language).title;
  }
  return t("Based on your last 4 weeks");
}

type ViewProps = {
  line: string;
  onOpen: () => void;
};

/** The line itself: «Coach», what it says, «›». */
export function CoachRowView({ line, onOpen }: ViewProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${t("Coach")}. ${line}`}
      testID="training-coach"
    >
      <View style={styles.text}>
        <Text style={styles.name}>{t("Coach")}</Text>
        <Text style={styles.line} numberOfLines={2}>
          {line}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

type Props = {
  fetchersOf?: (apiUrl: string, token: string) => CoachFetchers;
  fetchFn?: typeof fetch;
};

/**
 * The Coach's line on «Today» (TASK-490 part C, ADR-0398): under the body
 * of the week, it opens the Coach's page (TASK-491, ADR-0399) over
 * «Today»; «‹» comes back. The page is the one «My plans» opens, as it is.
 */
export function TrainingCoachRow({ fetchersOf, fetchFn }: Props) {
  const language = useLanguage();
  const coach = useCoach(fetchersOf, fetchFn);
  const [open, setOpen] = useState(false);
  const line = coachLine(coach.state, language);
  if (line === null) {
    return null;
  }
  return (
    <>
      <CoachRowView line={line} onOpen={() => setOpen(true)} />
      <Modal
        visible={open}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        {/* Its own edges, and mounted with the page: each opening reads
            the Coach again. */}
        {open && (
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
              <CoachPage
                onBack={() => setOpen(false)}
                fetchersOf={fetchersOf}
                fetchFn={fetchFn}
              />
            </SafeAreaView>
          </SafeAreaProvider>
        )}
      </Modal>
    </>
  );
}

// As the Coach's line in «My plans» (gym/GymPlans.tsx).
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: MIN_TAP_SIZE,
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: space.xs,
  },
  name: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  line: {
    color: color.textMuted,
    fontSize: fontSize.label,
  },
  chevron: {
    color: color.textFaint,
    fontSize: fontSize.heading,
  },
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
});
