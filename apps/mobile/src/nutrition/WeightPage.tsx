import { type ReactNode, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { WEIGHT_KG } from "../body/bodyProfile";
import { readNumber, weightKgOf, weightLabel, weightUnit } from "../body/bodyUnits";
import { removeWeighIn, useWeighIns, writeWeighIn } from "../body/useWeighIns";
import {
  daysBetween,
  latestOf,
  rangeStart,
  valueIn,
  type WeighIn,
  type WeightMode,
  type WeightRange,
  weightOf,
  weightStats,
  weeksIn,
} from "../body/weighIns";
import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useUnits } from "../units/useUnits";
import { signedKcal } from "./activityEnergy";
import { NutritionSheet } from "./AddFoodSheet";
import type { LocalDay } from "./localDay";
import { chartPoints, WeightChart } from "./WeightChart";
import { WeightGoalView } from "./WeightGoalSheet";
import { useWeightPeriod } from "./weightPeriod";
import { modeLabel, shortDay, signedPercent, signedWeight } from "./weightText";

type Props = {
  visible: boolean;
  today: LocalDay;
  now: Date;
  onClose: () => void;
};

type View_ = { at: "page" } | { at: "goal" } | { at: "edit"; day: LocalDay | null };

/**
 * The weight page (TASK-489 part K1, ADR-0397 precisazione 8): the weight
 * today and how it changed, the line in kilograms (or pounds), the change
 * from the first weigh-in or its percent of the starting weight, over
 * weeks, months or all; the statistics; the calorie balance of the same
 * weeks beside the change, with no judgement; all the weigh-ins, each to
 * change or take away; and «My goal weight».
 */
export function WeightPage({ visible, today, now, onClose }: Props) {
  return (
    <NutritionSheet visible={visible} onClose={onClose} testID="weight-page">
      <Body today={today} now={now} />
    </NutritionSheet>
  );
}

function Body({ today, now }: { today: LocalDay; now: Date }) {
  const weighIns = useWeighIns();
  const units = useUnits();
  const [mode, setMode] = useState<WeightMode>("kg");
  const [range, setRange] = useState<WeightRange>("months");
  const [view, setView] = useState<View_>({ at: "page" });
  const stats = weightStats(weighIns);
  const total = useWeightPeriod(stats?.start.day ?? null, today, now);

  if (view.at === "goal") {
    return (
      <Frame onBack={() => setView({ at: "page" })}>
        <WeightGoalView />
      </Frame>
    );
  }
  if (view.at === "edit") {
    const entry = weighIns.entries.find((item) => item.day === view.day) ?? null;
    return (
      <Frame onBack={() => setView({ at: "page" })}>
        <WeighInForm
          today={today}
          day={view.day ?? today}
          entry={entry}
          latest={latestOf(weighIns)}
          onDone={() => setView({ at: "page" })}
        />
      </Frame>
    );
  }

  const from = rangeStart(range, today);
  const shown = weighIns.entries.filter((entry) => from === null || entry.day >= from);
  const weeks = stats === null ? 0 : weeksIn(stats.days);
  const since =
    stats === null
      ? ""
      : t("Since your first weigh-in, {date}", {
          date: shortDay(stats.start.day, today),
        });
  const label = (kg: number) => weightLabel(kg, units);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title} accessibilityRole="header">
        {t("Weight")}
      </Text>

      {stats === null ? (
        <Text style={styles.muted} testID="weight-none">
          {t("No weigh-ins yet")}
        </Text>
      ) : (
        <View style={styles.hero}>
          <Text style={styles.muted}>{t("Today")}</Text>
          <Text style={styles.big} testID="weight-big">
            {modeLabel(mode, stats.latest.kg, stats.start.kg, units)}
          </Text>
          <Text style={styles.muted} testID="weight-sub">
            {mode === "change"
              ? since
              : mode === "percent"
                ? weeks >= 2
                  ? t("Of your starting weight, in {count} weeks", { count: weeks })
                  : since
                : weeks >= 2
                  ? t("{change} in {count} weeks", {
                      change: signedWeight(stats.changeKg, units),
                      count: weeks,
                    })
                  : since}
          </Text>
          {shown.length >= 2 ? (
            // Room under the words: the line's highest dot would touch them.
            <View style={styles.chart}>
              <WeightChart
                key={`${mode}-${range}`}
                points={chartPoints(
                  shown.map((entry) => ({
                    at: daysBetween(stats.start.day, entry.day),
                    value: valueIn(mode, entry.kg, stats.start.kg),
                  })),
                )}
                height={120}
                dots
                testID="weight-chart"
              />
            </View>
          ) : (
            <Text style={styles.muted} testID="weight-one">
              {t("One weigh-in so far: the line starts with the next.")}
            </Text>
          )}
        </View>
      )}

      {stats !== null && (
        <>
          <Choices
            options={[
              { key: "kg", label: weightUnit(units) },
              { key: "change", label: t("Change") },
              { key: "percent", label: "%" },
            ]}
            on={mode}
            onChoose={(key) => setMode(key as WeightMode)}
            testID="weight-mode"
          />
          <Choices
            options={[
              { key: "weeks", label: t("Weeks") },
              { key: "months", label: t("Months") },
              { key: "all", label: t("All@@weight") },
            ]}
            on={range}
            onChoose={(key) => setRange(key as WeightRange)}
            testID="weight-range"
          />
          <View style={styles.tiles}>
            <Tile label={t("Start@@weight")} value={label(stats.start.kg)} />
            <Tile label={t("Today")} value={label(stats.latest.kg)} />
            <Tile label={t("Highest@@weight")} value={label(stats.highestKg)} />
            <Tile label={t("Lowest")} value={label(stats.lowestKg)} />
            <Tile
              label={t("Per week")}
              value={
                stats.perWeekKg === null ? "—" : signedWeight(stats.perWeekKg, units)
              }
            />
            <Tile
              label={t("Weigh-ins")}
              value={t("{count} since {date}", {
                count: stats.count,
                date: shortDay(stats.start.day, today),
              })}
            />
          </View>
          <View style={styles.card} testID="weight-balance">
            <Text style={styles.muted}>
              {weeks >= 2 ? t("Same {count} weeks", { count: weeks }) : since}
            </Text>
            <Text style={styles.text}>
              {t("Balance {kcal} kcal (est.) · Weight {change}", {
                kcal: total === null ? "—" : signedKcal(total.balance),
                change:
                  mode === "percent"
                    ? signedPercent(stats.changePercent)
                    : signedWeight(stats.changeKg, units),
              })}
            </Text>
          </View>
        </>
      )}

      <Tap
        style={[gymStyles.button, styles.wide]}
        onPress={() => setView({ at: "edit", day: null })}
        accessibilityRole="button"
        testID="weight-add"
      >
        <Text style={gymStyles.buttonText}>{t("Add a weigh-in")}</Text>
      </Tap>
      <Tap
        style={styles.row}
        onPress={() => setView({ at: "goal" })}
        accessibilityRole="button"
        testID="weight-open-goal"
      >
        <Text style={styles.text}>{t("My goal weight")}</Text>
        <Text style={styles.muted}>
          {weighIns.goal === null ? "›" : `${label(weighIns.goal.kg)} ›`}
        </Text>
      </Tap>

      {weighIns.entries.length > 0 && (
        <>
          <Text style={styles.section} accessibilityRole="header">
            {t("All weigh-ins")}
          </Text>
          {[...weighIns.entries].reverse().map((entry) => (
            <Tap
              key={entry.day}
              style={styles.row}
              onPress={() => setView({ at: "edit", day: entry.day })}
              accessibilityRole="button"
              testID={`weight-entry-${entry.day}`}
            >
              <Text style={styles.text}>{shortDay(entry.day, today)}</Text>
              <Text style={styles.muted}>{`${label(entry.kg)} ›`}</Text>
            </Tap>
          ))}
        </>
      )}
    </ScrollView>
  );
}

/** A view inside the page, with a way back to it. */
function Frame({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Tap
        style={styles.back}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t("Weight")}
        testID="weight-back"
      >
        <Text style={styles.text}>{`‹ ${t("Weight")}`}</Text>
      </Tap>
      {children}
    </ScrollView>
  );
}

/** A weigh-in to add (today) or to change, and to take away. */
function WeighInForm({
  today,
  day,
  entry,
  latest,
  onDone,
}: {
  today: LocalDay;
  day: LocalDay;
  entry: WeighIn | null;
  latest: WeighIn | null;
  onDone: () => void;
}) {
  const units = useUnits();
  const [text, setText] = useState("");
  const [asking, setAsking] = useState(false);
  const typed = readNumber(text);
  const kg = typed === null ? null : weightOf(weightKgOf(typed, units));
  const wrong = text.trim() !== "" && kg === null;
  const isLatest = entry !== null && latest !== null && latest.day === entry.day;

  function save() {
    if (kg !== null) {
      writeWeighIn(day, kg);
      onDone();
    }
  }

  return (
    <View style={styles.body} testID="weigh-in-form">
      <Text style={styles.title} accessibilityRole="header">
        {entry === null ? t("Add a weigh-in") : t("Edit")}
      </Text>
      {entry !== null && (
        <Text
          style={styles.muted}
        >{`${shortDay(entry.day, today)} · ${weightLabel(entry.kg, units)}`}</Text>
      )}
      <View style={styles.field}>
        <TextInput
          style={[gymStyles.input, styles.input]}
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          maxLength={6}
          keyboardAppearance="dark"
          returnKeyType="done"
          onSubmitEditing={save}
          autoFocus
          accessibilityLabel={t("Your weight")}
          testID="weigh-in-form-input"
        />
        <Text style={styles.muted}>{weightUnit(units)}</Text>
      </View>
      {wrong && (
        <Text style={styles.problem}>
          {t("Write a weight between {min} and {max}.", {
            min: weightLabel(WEIGHT_KG.min, units),
            max: weightLabel(WEIGHT_KG.max, units),
          })}
        </Text>
      )}
      <Tap
        style={[gymStyles.button, styles.wide, kg === null && gymStyles.disabled]}
        onPress={save}
        disabled={kg === null}
        accessibilityRole="button"
        accessibilityState={{ disabled: kg === null }}
        testID="weigh-in-form-save"
      >
        <Text style={gymStyles.buttonText}>{t("Save")}</Text>
      </Tap>
      {entry !== null && !asking && (
        <Tap
          style={styles.back}
          onPress={() => setAsking(true)}
          accessibilityRole="button"
          testID="weigh-in-form-delete"
        >
          <Text style={[styles.text, gymStyles.danger]}>{t("Delete")}</Text>
        </Tap>
      )}
      {entry !== null && asking && (
        <View style={styles.card} testID="weigh-in-form-confirm">
          <Text style={styles.text}>{t("Delete this weigh-in?")}</Text>
          {isLatest && latest !== null && (
            <Text style={styles.muted}>
              {t("Your weight in Settings stays {weight}.", {
                weight: weightLabel(latest.kg, units),
              })}
            </Text>
          )}
          <View style={gymStyles.row}>
            <Tap
              style={gymStyles.button}
              onPress={() => setAsking(false)}
              accessibilityRole="button"
            >
              <Text style={gymStyles.buttonText}>{t("Cancel")}</Text>
            </Tap>
            <Tap
              style={gymStyles.button}
              onPress={() => {
                removeWeighIn(entry.day);
                onDone();
              }}
              accessibilityRole="button"
              testID="weigh-in-form-delete-yes"
            >
              <Text style={[gymStyles.buttonText, gymStyles.danger]}>
                {t("Delete")}
              </Text>
            </Tap>
          </View>
        </View>
      )}
    </View>
  );
}

function Choices({
  options,
  on,
  onChoose,
  testID,
}: {
  options: readonly { key: string; label: string }[];
  on: string;
  onChoose: (key: string) => void;
  testID: string;
}) {
  return (
    <View style={styles.choices} accessibilityRole="radiogroup">
      {options.map((option) => {
        const chosen = option.key === on;
        return (
          <Tap
            key={option.key}
            style={[styles.choice, chosen && styles.choiceOn]}
            onPress={() => onChoose(option.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: chosen }}
            testID={`${testID}-${option.key}`}
          >
            <Text style={chosen ? styles.text : styles.muted}>{option.label}</Text>
          </Tap>
        );
      })}
    </View>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.text}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexShrink: 1,
  },
  body: {
    gap: space.sm,
    paddingBottom: space.md,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  section: {
    ...font.cardTitle,
    color: color.text,
    marginTop: space.md,
  },
  chart: {
    marginTop: space.md,
  },
  hero: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  big: {
    ...font.title,
    color: color.text,
  },
  text: {
    ...font.body,
    color: color.text,
  },
  muted: {
    ...font.small,
    color: color.textMuted,
  },
  problem: {
    ...font.small,
    color: color.error,
  },
  choices: {
    flexDirection: "row",
    padding: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  choice: {
    flex: 1,
    minHeight: MIN_TAP_SIZE - space.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  choiceOn: {
    backgroundColor: color.surfaceRaised,
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: space.xs / 2,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  card: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  wide: {
    flex: 0,
  },
  row: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  back: {
    alignSelf: "flex-start",
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  input: {
    width: 120,
  },
});
