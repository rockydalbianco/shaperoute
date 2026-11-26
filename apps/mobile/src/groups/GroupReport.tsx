import { REPORT_REASONS, type ReportReason } from "@shaperoute/shared-types";
import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { sessionEnded } from "../account/messages";
import { report } from "../api/moderation";
import { t } from "../i18n";
import { moderationProblem, REASON_TEXTS, REPORTED } from "../social/ReportMenu";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { sayInIsland } from "../ui/IslandLayer";
import { SheetModal } from "../ui/SheetModal";
import { useSheetFace } from "../ui/sheetFace";
import { Tap } from "../ui/Tap";

type Step =
  | { kind: "closed" }
  | { kind: "reasons" }
  | { kind: "sending" }
  | { kind: "said"; words: string };

type Props = {
  apiUrl: string;
  token: string;
  groupId: string;
  onSessionEnded: (token: string) => void;
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * The «…» of a group's page (TASK-495 part B, GRUPPI.md §10): «Report»
 * with the reasons of the app's report menu (`ReportMenu`), sent as
 * `POST /reports` with the kind `group`. No «Block» here: who is not a
 * member does not know the admin; the admin's profile has it.
 */
export function GroupReport({
  apiUrl,
  token,
  groupId,
  onSessionEnded,
  fetchFn,
  apiKey,
}: Props) {
  const [step, setStep] = useState<Step>({ kind: "closed" });
  const close = () => setStep({ kind: "closed" });

  function reportFor(reason: ReportReason) {
    setStep({ kind: "sending" });
    void report(apiUrl, token, "group", groupId, reason, { fetchFn, key: apiKey }).then(
      (outcome) => {
        if (outcome.kind === "ok") {
          close();
          sayInIsland(t(REPORTED));
          return;
        }
        setStep({ kind: "said", words: moderationProblem(outcome) });
        if (sessionEnded(outcome)) {
          onSessionEnded(token);
        }
      },
    );
  }

  return (
    <>
      <Tap
        style={styles.more}
        onPress={() => setStep({ kind: "reasons" })}
        accessibilityRole="button"
        accessibilityLabel={t("More")}
        accessibilityHint={t("Report")}
        hitSlop={space.sm}
        testID="group-report"
      >
        <Text style={styles.moreText}>…</Text>
      </Tap>
      <SheetModal visible={step.kind !== "closed"} onRequestClose={close}>
        <Pressable
          style={styles.backdrop}
          onPress={close}
          accessible={false}
          importantForAccessibility="no"
        />
        <Sheet>
          {step.kind === "reasons" && (
            <>
              <Text style={styles.title} accessibilityRole="header">
                {t("Why are you reporting this?")}
              </Text>
              {REPORT_REASONS.map((reason) => (
                <Choice
                  key={reason}
                  label={t(REASON_TEXTS[reason])}
                  onPress={() => reportFor(reason)}
                />
              ))}
            </>
          )}
          {step.kind === "sending" && (
            <Text style={styles.words} accessibilityLiveRegion="polite">
              {t("Sending…")}
            </Text>
          )}
          {step.kind === "said" && (
            <Text style={styles.words} accessibilityLiveRegion="polite">
              {step.words}
            </Text>
          )}
          <Choice
            label={step.kind === "said" ? t("Close") : t("Cancel")}
            onPress={close}
          />
        </Sheet>
      </SheetModal>
    </>
  );
}

function Sheet({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const glassSheet = useSheetFace();
  return (
    <View
      style={[styles.sheet, glassSheet, { paddingBottom: insets.bottom + space.sm }]}
    >
      {children}
    </View>
  );
}

function Choice({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Tap style={styles.choice} onPress={onPress} accessibilityRole="button">
      <Text style={styles.choiceText}>{label}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
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
  backdrop: {
    flex: 1,
  },
  sheet: {
    gap: space.sm,
    padding: space.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  title: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  words: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  choice: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  choiceText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
});
