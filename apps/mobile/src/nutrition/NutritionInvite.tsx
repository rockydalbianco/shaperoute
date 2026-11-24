import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { color, font, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { NUTRITION_ON } from "./nutritionOn";
import { NutritionWindow } from "./NutritionWindow";
import { Ring } from "./Ring";
import { dismissInvite, seeInvite, useNutrition } from "./useNutrition";

/** How many times the invitation is shown to who never said «Not now». */
export const INVITE_TIMES = 3;

export const NUTRITION_INVITE_TEST_ID = "nutrition-invite";
export const NUTRITION_AFTER_TEST_ID = "nutrition-after";

type Props = {
  /** The kilocalories estimated for the activity that just ended, when the
   * screen knows them. */
  kcal?: number | null;
};

/**
 * «Nutrition» at the end of an activity (TASK-489 part I, the user's
 * request of 2026-11-24). For who never opened it, an invitation: what it
 * does in two lines, «Open Nutrition» and «Not now». «Not now» takes it
 * away for good, and without it the invitation is shown `INVITE_TIMES`
 * times at most: «Nutrition» stays in the sport panel and on the profile.
 * For who uses it, the way to the diary: «Add what you ate», with the
 * calories estimated for the activity when the screen knows them.
 *
 * The invitation promises no diet: the diet is the user's own, and every
 * number an estimate. Nothing while «Nutrition» is off.
 */
export function NutritionInvite({ kcal = null }: Props) {
  return NUTRITION_ON ? <AtTheEnd kcal={kcal} /> : null;
}

function AtTheEnd({ kcal }: { kcal: number | null }) {
  const { settings } = useNutrition();
  const [open, setOpen] = useState(false);
  // Decided as the screen comes: counting this showing must not hide it.
  const [invited] = useState(
    () =>
      !settings.noticeSeen &&
      !settings.invite.off &&
      settings.invite.seen < INVITE_TIMES,
  );
  useEffect(() => {
    if (invited) {
      seeInvite();
    }
  }, [invited]);

  const page = <NutritionWindow open={open} onClose={() => setOpen(false)} />;
  if (settings.noticeSeen) {
    return (
      <>
        <View style={[styles.box, styles.after]} testID={NUTRITION_AFTER_TEST_ID}>
          <Text style={styles.line}>
            {kcal !== null && kcal > 0
              ? t("This activity: {kcal} kcal (est.)", {
                  kcal: String(Math.round(kcal)),
                })
              : t("Nutrition")}
          </Text>
          <Tap
            style={[gymStyles.button, styles.narrow]}
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            testID="nutrition-after-add"
          >
            <Text style={gymStyles.buttonText}>{t("Add what you ate")}</Text>
          </Tap>
        </View>
        {page}
      </>
    );
  }
  if (!invited || settings.invite.off) {
    // The page stays if it was opened from the invitation and then left.
    return open ? page : null;
  }
  return (
    <>
      <View style={styles.box} testID={NUTRITION_INVITE_TEST_ID}>
        <View style={styles.top}>
          <View style={styles.rings}>
            <Ring
              size={OUTER}
              stroke={STROKE}
              share={0.85}
              colour={color.textMuted}
              track={color.border}
            />
            <View style={styles.inner}>
              <Ring
                size={INNER}
                stroke={STROKE}
                share={0.6}
                colour={color.text}
                track={color.border}
              />
            </View>
          </View>
          <View style={styles.words}>
            <Text style={styles.title} accessibilityRole="header">
              {t("Count what you eat too")}
            </Text>
            <Text style={styles.note}>
              {t(
                "Write your own diet and what you eat: MuW estimates the calories you eat and the ones you use, this activity included.",
              )}
            </Text>
          </View>
        </View>
        <View style={gymStyles.row}>
          <Tap
            style={gymStyles.button}
            onPress={() => dismissInvite()}
            accessibilityRole="button"
            testID="nutrition-invite-not-now"
          >
            <Text
              style={gymStyles.buttonText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {t("Not now")}
            </Text>
          </Tap>
          <Tap
            style={gymStyles.button}
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            testID="nutrition-invite-open"
          >
            <Text
              style={gymStyles.buttonText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {t("Open Nutrition")}
            </Text>
          </Tap>
        </View>
      </View>
      {page}
    </>
  );
}

const OUTER = 56;
const STROKE = 6;
const INNER = OUTER - 2 * (STROKE + space.xs);

const styles = StyleSheet.create({
  // As the other cards of «Nutrition».
  box: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  after: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  rings: {
    width: OUTER,
    height: OUTER,
  },
  inner: {
    position: "absolute",
    top: (OUTER - INNER) / 2,
    left: (OUTER - INNER) / 2,
  },
  words: {
    flex: 1,
    gap: space.xs,
  },
  title: {
    ...font.cardTitle,
    color: color.text,
  },
  note: {
    ...font.small,
    color: color.textMuted,
  },
  line: {
    ...font.body,
    flexShrink: 1,
    color: color.text,
  },
  narrow: {
    flex: 0,
  },
});
