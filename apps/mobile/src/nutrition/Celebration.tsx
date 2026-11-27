import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { weightLabel } from "../body/bodyUnits";
import { useBody } from "../body/useBody";
import { cheerSeen, useWeighIns } from "../body/useWeighIns";
import { type Cheer, cheersDue } from "../body/weightGoal";
import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { color, font, radius, space } from "../theme/tokens";
import { springTo } from "../ui/motion";
import { Tap } from "../ui/Tap";
import { useReduceMotion } from "../ui/useReduceMotion";
import { useUnits } from "../units/useUnits";
import { diaryDaysOnPhone } from "./diaryDays";

/** The two lines of a congratulation. */
export function cheerText(
  cheer: Cheer,
  weight: (kg: number) => string,
): { title: string; line: string } {
  switch (cheer.kind) {
    case "goal":
      return {
        title: t("You reached your goal"),
        line: t("{weight}, the goal you set yourself.", { weight: weight(cheer.kg) }),
      };
    case "milestone":
      return {
        title: t("You reached {weight}", { weight: weight(cheer.kg) }),
        line: t("A milestone you set yourself."),
      };
    case "weighIns":
      return {
        title: t("{count} weigh-ins", { count: cheer.count }),
        line: t("You kept at it."),
      };
    case "diaryDays":
      return {
        title: t("{count} days in your diary", { count: cheer.count }),
        line: t("You kept at it."),
      };
  }
}

type Props = {
  /** The year now, for the age (weightGoal.ts); a test gives its own. */
  year?: number;
};

/**
 * The congratulations (TASK-489 part K1; the rule the user approved on
 * 2026-11-24 and 2026-11-27): a card in the diary when a milestone or the
 * goal the user wrote is reached, or for keeping at it (weigh-ins kept,
 * days of diary), never for the speed; none on the weight under a body
 * mass index of 18.5 or under 18 (weightGoal.ts). One at a time, each shown
 * once; it comes in with a small jump, still with «Reduce Motion».
 */
export function Celebration({ year = new Date().getFullYear() }: Props) {
  const weighIns = useWeighIns();
  const body = useBody();
  const units = useUnits();
  // The diary's files are read once a time the page opens: a day written
  // now is counted at the next opening.
  const [diaryDays] = useState(diaryDaysOnPhone);
  const cheer = cheersDue(weighIns, body, year, diaryDays)[0] ?? null;
  if (cheer === null) {
    return null;
  }
  return <Card key={cheer.key} cheer={cheer} weight={(kg) => weightLabel(kg, units)} />;
}

function Card({ cheer, weight }: { cheer: Cheer; weight: (kg: number) => string }) {
  const still = useReduceMotion();
  const [shown] = useState(() => new Animated.Value(still ? 1 : 0));
  useEffect(() => {
    if (still) {
      shown.setValue(1);
      return;
    }
    const come = springTo(shown, 1, "island");
    come.start();
    return () => come.stop();
  }, [shown, still]);
  const { title, line } = cheerText(cheer, weight);
  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: shown,
          transform: [
            {
              scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
            },
          ],
        },
      ]}
      accessible
      accessibilityLabel={`${title}. ${line}`}
      testID="celebration"
    >
      <Text style={styles.mark} importantForAccessibility="no">
        ✦
      </Text>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.line}>{line}</Text>
      <Tap
        style={[gymStyles.button, styles.done]}
        onPress={() => cheerSeen(cheer)}
        accessibilityRole="button"
        testID="celebration-done"
      >
        <Text style={gymStyles.buttonText}>{t("Done")}</Text>
      </Tap>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  mark: {
    ...font.heading,
    color: color.text,
  },
  title: {
    ...font.cardTitle,
    color: color.text,
    textAlign: "center",
  },
  line: {
    ...font.small,
    color: color.textMuted,
    textAlign: "center",
  },
  done: {
    alignSelf: "stretch",
    flex: 0,
    marginTop: space.sm,
  },
});
