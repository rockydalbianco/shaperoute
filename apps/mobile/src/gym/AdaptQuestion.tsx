import type { GymPlanFeel, GymPlanSession, GymProgram } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { appLanguage } from "../i18n/language";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useUnits } from "../units/useUnits";
import { answerDay, answered, answerTitle, FEELS, nextTime } from "./adapt";

/**
 * «How did it go?» at the end of a workout of a plan (TASK-488, the mockup
 * H1–H2 approved on 2026-11-22): «Easy», «Right», «Hard», once for the
 * whole day; then what changes next time, with «Change» until «Save».
 * Nothing is kept here: the screen that shows it keeps the answer with the
 * workout. No answer: the plan goes on as planned.
 */
export function AdaptQuestion({
  program,
  session,
  date,
  feel,
  onFeel,
  heading,
}: {
  program: GymProgram;
  /** The day of the plan the workout was. */
  session: GymPlanSession;
  /** When the workout began. */
  date: Date;
  feel: GymPlanFeel | null;
  onFeel: (feel: GymPlanFeel | null) => void;
  /** Over the three answers; «How did it go?» without. */
  heading?: string;
}) {
  const units = useUnits();
  if (feel === null) {
    return (
      <View style={styles.card} testID="adapt-question">
        <Text style={styles.title}>{heading ?? t("How did it go?")}</Text>
        <Text style={styles.note}>
          {t("Next time the plan adjusts to your answer.")}
        </Text>
        <View style={styles.choices} accessibilityRole="radiogroup">
          {FEELS.map((one) => (
            <Pressable
              key={one.feel}
              style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
              onPress={() => onFeel(one.feel)}
              accessibilityRole="radio"
              accessibilityState={{ selected: false }}
              accessibilityLabel={`${t(one.title)}, ${t(one.note)}`}
              testID={`adapt-${one.feel}`}
            >
              <Text style={styles.choiceTitle}>{t(one.title)}</Text>
              <Text style={styles.choiceNote}>{t(one.note)}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.note, styles.center]}>
          {t("No answer? It goes on as planned.")}
        </Text>
      </View>
    );
  }
  const after = answered(program, session, feel);
  const day = answerDay(program, session, feel);
  const lines = nextTime(program, after, session.day, date, units, appLanguage());
  return (
    <View style={styles.card} testID="adapt-answer">
      <View style={styles.top}>
        <Text style={[styles.title, styles.grow]} testID="adapt-title">
          {answerTitle(day)}
        </Text>
        <Pressable
          style={styles.change}
          onPress={() => onFeel(null)}
          accessibilityRole="button"
          testID="adapt-change"
        >
          <Text style={styles.changeText}>{t("Change@@answer")}</Text>
        </Pressable>
      </View>
      {lines.length > 0 && (
        <>
          <Text style={styles.note}>
            {t("Next {day}, {name}:", {
              day: new Date(date.getTime() + WEEK_MS).toLocaleDateString(
                appLanguage(),
                {
                  weekday: "long",
                },
              ),
              name: session.name,
            })}
          </Text>
          <View style={styles.list}>
            {lines.map((line, index) => (
              <View
                key={`${line.name}-${index}`}
                style={[styles.line, index > 0 && styles.lineRule]}
                testID="adapt-line"
              >
                <Text style={[styles.lineName, styles.grow]} numberOfLines={1}>
                  {line.name}
                </Text>
                <Text style={styles.note}>
                  {line.was === line.next ? (
                    <Text style={styles.lineNext}>{line.next}</Text>
                  ) : (
                    <>
                      {`${line.was} → `}
                      <Text style={styles.lineNext}>{line.next}</Text>
                    </>
                  )}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
      <Text style={styles.note}>
        {t(
          "Easy: one step more than planned. Right: as planned. Hard: the same next time; after two «Hard» in a row, one step back.",
        )}
      </Text>
    </View>
  );
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  title: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  center: {
    textAlign: "center",
  },
  choices: {
    flexDirection: "row",
    gap: space.sm,
  },
  choice: {
    flex: 1,
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
  },
  pressed: {
    borderColor: color.accent,
    backgroundColor: color.surfaceRaised,
  },
  choiceTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  choiceNote: {
    color: color.textMuted,
    fontSize: fontSize.detail,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  grow: {
    flex: 1,
  },
  change: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.xs,
  },
  changeText: {
    color: color.textMuted,
    fontSize: fontSize.small,
    textDecorationLine: "underline",
  },
  list: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.surfaceRaised,
    backgroundColor: color.background,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  lineRule: {
    borderTopWidth: 1,
    borderColor: color.surfaceRaised,
  },
  lineName: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  lineNext: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
});
