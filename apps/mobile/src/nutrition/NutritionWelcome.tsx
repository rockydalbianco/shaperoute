import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { readNumber } from "../body/bodyUnits";
import { gymStyles } from "../gym/gymStyles";
import { t, tLater } from "../i18n";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { ringShares } from "./dayRings";
import { EnergyRings } from "./EnergyRings";
import { EstimateBox } from "./EstimateBox";
import { NutritionNotice } from "./NutritionNotice";
import { TARGET_KCAL, targetOf } from "./ownTarget";
import { about, type Purpose, PURPOSES } from "./targetEstimate";
import { seeNotice, useNutrition, writePurpose, writeTarget } from "./useNutrition";
import { useUsualUse } from "./useUsualUse";

/** The numbers of the picture at the door: an example, and said so. */
const EXAMPLE = { eaten: 1850, used: 2300 } as const;

// In English; shown with t() in the app's language.
const PURPOSE_NAMES: { readonly [P in Purpose]: string } = {
  track: tLater("Keep track of what I eat"),
  lose: tLater("Lose weight"),
  gain: tLater("Gain weight"),
  plan: tLater("Follow my dietitian's plan"),
};

const HOW: readonly (readonly [string, string])[] = [
  [
    tLater("Write your plan"),
    tLater("Your own diet, or your dietitian's, day by day."),
  ],
  [tLater("Log what you eat"), tLater("Foods and grams: MuW estimates the calories.")],
  [tLater("See your balance"), tLater("Eaten less used, with all your activities.")],
];

type Step = "how" | "rules" | "why" | "start";

type Props = {
  /** «Start», or the end of a look at «How it works»: on to the page. */
  onDone: () => void;
  /** The moment, for a usual day; a test gives its own. */
  now?: Date;
};

/**
 * The door of «Nutrition» (TASK-489 part J; ADR-0397, precisazione 5): the
 * first time, four steps before the page. What it does, with a picture;
 * the rules («Before you start», as before); why the user is here, which
 * only changes what the page puts first and can be skipped; and where to
 * start from: what the body uses in a usual day, the field of «My daily
 * target», and MuW's estimate behind it, closed.
 *
 * The user's own number comes first, by the user's choice: the estimate is
 * «only a demo». Opened again later from «How it works», the rules are not
 * asked again.
 */
export function NutritionWelcome({ onDone, now }: Props) {
  const { settings } = useNutrition();
  const [step, setStep] = useState<Step>("how");
  const [purpose, setPurpose] = useState<Purpose | null>(settings.purpose);
  const [text, setText] = useState(
    settings.target === null ? "" : String(settings.target),
  );
  // One moment for the whole visit: the usual day is not counted again at
  // every key pressed.
  const [moment] = useState(() => now ?? new Date());
  const usedPerDay = useUsualUse(moment);

  if (step === "how") {
    return (
      <View style={styles.step} testID="welcome-how">
        <Text style={styles.lead}>
          {t("Your food diary: what you eat, what you use, and the balance.")}
        </Text>
        <View style={styles.example}>
          <EnergyRings shares={ringShares(EXAMPLE.eaten, EXAMPLE.used, null)} />
          <View style={styles.exampleText}>
            <Text style={styles.note}>{t("Example")}</Text>
            <Text style={styles.text}>{`${t("Eaten")} ${EXAMPLE.eaten}`}</Text>
            <Text style={styles.text}>{`${t("Used (est.)")} ${EXAMPLE.used}`}</Text>
          </View>
        </View>
        {HOW.map(([title, line]) => (
          <View key={title}>
            <Text style={styles.title}>{t(title)}</Text>
            <Text style={styles.note}>{t(line)}</Text>
          </View>
        ))}
        <Tap
          style={[gymStyles.button, styles.wide]}
          // The rules were read once: a second look goes past them.
          onPress={() => setStep(settings.noticeSeen ? "why" : "rules")}
          accessibilityRole="button"
          testID="welcome-next"
        >
          <Text style={gymStyles.buttonText}>{t("Next@@step")}</Text>
        </Tap>
      </View>
    );
  }

  if (step === "rules") {
    return (
      <NutritionNotice
        onUnderstood={() => {
          seeNotice();
          setStep("why");
        }}
      />
    );
  }

  if (step === "why") {
    const on = (next: Purpose | null) => {
      writePurpose(next);
      setStep("start");
    };
    return (
      <View style={styles.step} testID="welcome-why">
        <Text style={styles.heading} accessibilityRole="header">
          {t("What brings you here?")}
        </Text>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {PURPOSES.map((each) => (
            <Tap
              key={each}
              style={[styles.choice, purpose === each && styles.chosen]}
              onPress={() => setPurpose(each)}
              accessibilityRole="radio"
              accessibilityState={{ checked: purpose === each }}
              testID={`welcome-why-${each}`}
            >
              <Text style={styles.text}>{t(PURPOSE_NAMES[each])}</Text>
            </Tap>
          ))}
        </View>
        <Text style={styles.note}>
          {t("You can skip this: it only changes what the page shows first.")}
        </Text>
        <View style={gymStyles.row}>
          <Tap
            style={gymStyles.button}
            onPress={() => on(null)}
            accessibilityRole="button"
            testID="welcome-skip"
          >
            <Text style={gymStyles.buttonText}>{t("Skip")}</Text>
          </Tap>
          <Tap
            style={[gymStyles.button, purpose === null && gymStyles.disabled]}
            onPress={() => on(purpose)}
            disabled={purpose === null}
            accessibilityRole="button"
            accessibilityState={{ disabled: purpose === null }}
            testID="welcome-why-next"
          >
            <Text style={gymStyles.buttonText}>{t("Next@@step")}</Text>
          </Tap>
        </View>
      </View>
    );
  }

  const typed = readNumber(text);
  const kcal = typed === null ? null : targetOf(typed);
  return (
    <View style={styles.step} testID="welcome-start">
      {usedPerDay !== null && (
        <Text style={styles.heading} accessibilityRole="header" testID="welcome-used">
          {t("You use about {kcal} kcal a day (est.)", {
            kcal: String(about(usedPerDay)),
          })}
        </Text>
      )}
      <Text style={styles.note}>
        {t("Eating less than you use is a deficit; more is a surplus.")}
      </Text>
      <View style={styles.field}>
        <Text style={styles.title}>{t("My daily target")}</Text>
        <Text style={styles.note}>
          {t("Best: write your own number, or your dietitian's.")}
        </Text>
        <TextInput
          style={gymStyles.input}
          value={text}
          onChangeText={setText}
          keyboardType="number-pad"
          maxLength={String(TARGET_KCAL.max).length}
          placeholderTextColor={color.textFaint}
          keyboardAppearance="dark"
          returnKeyType="done"
          accessibilityLabel={t("kcal a day")}
          testID="welcome-target"
        />
      </View>
      <EstimateBox
        purpose={settings.purpose}
        usedPerDay={usedPerDay}
        year={moment.getFullYear()}
        onUse={(estimate) => setText(String(estimate))}
      />
      <Tap
        style={[gymStyles.button, styles.wide]}
        onPress={() => {
          // An empty field leaves the target as it was: none, the first time.
          if (kcal !== null) {
            writeTarget(kcal);
          }
          onDone();
        }}
        accessibilityRole="button"
        testID="welcome-start-button"
      >
        <Text style={gymStyles.buttonText}>{t("Start@@nutrition")}</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  step: {
    gap: space.md,
  },
  lead: {
    ...font.body,
    color: color.textMuted,
  },
  heading: {
    ...font.heading,
    color: color.text,
  },
  title: {
    ...font.cardTitle,
    color: color.text,
  },
  text: {
    ...font.body,
    color: color.text,
  },
  note: {
    ...font.small,
    color: color.textMuted,
  },
  example: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  exampleText: {
    flex: 1,
    gap: space.xs,
  },
  choices: {
    gap: space.sm,
  },
  choice: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  chosen: {
    borderColor: color.text,
  },
  field: {
    gap: space.xs,
  },
  wide: {
    flex: 0,
  },
});
