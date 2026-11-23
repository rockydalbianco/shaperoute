import type { GymProgram } from "@shaperoute/shared-types";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import { color, font, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { gymStyles } from "./gymStyles";
import { planTable, type TableCell } from "./tableOfPlan";

/** The height of a row of the table, so the names and the weeks line up. */
const ROW = 52;
/** The height of the weeks' heads. */
const HEAD = 52;
/** The width of a week's column, and of the names' column. */
const COLUMN = 76;
const NAMES = 128;

/**
 * «Table» (TASK-506 A, the user's «Da guardare + Settimane» of
 * 2026-11-23): the whole plan on one page, a tab a workout, a row an
 * exercise, a column a week of the cycle in progress with its sets × reps
 * and kg. This week's column is ringed, the weeks gone by are quiet, the
 * lighter one says so. It is only to look at: a week's head opens the
 * guide's «Weeks», where a week is changed by hand.
 */
export function PlanTable({
  name,
  program,
  today,
  onBack,
  onWeeks,
}: {
  name: string;
  program: GymProgram;
  today: Date;
  onBack: () => void;
  /** A week's head touched: the guide's step «Weeks». */
  onWeeks: () => void;
}) {
  const language = useLanguage();
  const table = planTable(program, today, language);
  const [shown, setShown] = useState(0);
  const tab = table.tabs[Math.min(shown, table.tabs.length - 1)];
  const weeks = Array.from({ length: table.weeks }, (_, i) => i + 1);
  const quiet = (week: number) =>
    (table.now !== null && week < table.now) || table.lighter[week - 1];

  return (
    <View style={styles.page} testID="plan-table">
      <View style={styles.top}>
        <Pressable
          style={gymStyles.chip}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
          testID="plan-table-back"
        >
          <Text style={gymStyles.chipText}>‹</Text>
        </Pressable>
        <View style={styles.titles}>
          <Text style={gymStyles.title} accessibilityRole="header">
            {t("Table")}
          </Text>
          <Text style={gymStyles.muted} numberOfLines={2}>
            {table.now !== null && table.weeks > 1
              ? `${name} · ${t("Week {n} of {total}", {
                  n: String(table.now),
                  total: String(table.weeks),
                })}`
              : name}
          </Text>
        </View>
      </View>
      {table.tabs.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={gymStyles.row}
          style={styles.tabs}
          accessibilityRole="tablist"
        >
          {table.tabs.map((one, i) => {
            const on = one === tab;
            return (
              <Pressable
                key={one.day}
                style={[gymStyles.chip, on && gymStyles.chipOn]}
                onPress={() => setShown(i)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                testID={`plan-table-tab-${i}`}
              >
                <Text style={[gymStyles.chipText, on && gymStyles.chipTextOn]}>
                  {one.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <ScrollView contentContainerStyle={styles.body}>
        {tab === undefined || tab.rows.length === 0 ? (
          <Text style={gymStyles.muted}>{t("No exercises yet.")}</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.names}>
              <View style={styles.head} />
              {tab.rows.map((row) => (
                <View key={row.key} style={styles.nameCell}>
                  <Text style={styles.name} numberOfLines={2}>
                    {row.label}
                  </Text>
                </View>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {weeks.map((week) => {
                const now = week === table.now;
                const caption = table.byHand[week - 1]
                  ? t("By hand")
                  : table.lighter[week - 1]
                    ? t("Lighter")
                    : "";
                return (
                  <View
                    key={week}
                    style={[styles.column, now && styles.columnNow]}
                    testID={`plan-table-column-${week}`}
                  >
                    <Pressable
                      style={({ pressed }) => [styles.head, pressed && styles.pressed]}
                      onPress={onWeeks}
                      accessibilityRole="button"
                      accessibilityLabel={t("Change week {n}", { n: String(week) })}
                      testID={`plan-table-week-${week}`}
                    >
                      <Text style={[styles.week, now && styles.weekNow]}>
                        {t("Wk {n}", { n: String(week) })}
                      </Text>
                      {caption !== "" && <Text style={styles.caption}>{caption}</Text>}
                    </Pressable>
                    {tab.rows.map((row, r) => (
                      <Cell
                        key={row.key}
                        cell={row.cells[week - 1]}
                        quiet={quiet(week)}
                        testID={`plan-table-cell-${r}-${week}`}
                      />
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
        <Text style={styles.hint}>{t("kg · touch a week to change it")}</Text>
      </ScrollView>
    </View>
  );
}

function Cell({
  cell,
  quiet,
  testID,
}: {
  cell: TableCell | null;
  quiet: boolean;
  testID: string;
}) {
  return (
    <View style={styles.cell} testID={testID}>
      {cell === null ? (
        <Text style={styles.none}>—</Text>
      ) : (
        <>
          <Text style={[styles.amount, quiet && styles.quiet]}>{cell.amount}</Text>
          {cell.kg !== null && (
            <Text style={[styles.kg, quiet && styles.quiet]}>{cell.kg}</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    gap: space.md,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  titles: {
    flex: 1,
    gap: space.xs,
  },
  tabs: {
    flexGrow: 0,
  },
  body: {
    gap: space.md,
    paddingBottom: space.lg,
  },
  table: {
    flexDirection: "row",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    paddingVertical: space.xs,
    overflow: "hidden",
  },
  names: {
    width: NAMES,
    paddingLeft: space.md,
  },
  nameCell: {
    height: ROW,
    justifyContent: "center",
    paddingRight: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  name: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  column: {
    width: COLUMN,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  columnNow: {
    borderColor: color.accent,
  },
  head: {
    height: HEAD,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  week: {
    ...font.detail,
    color: color.textMuted,
    fontWeight: fontWeight.semibold,
  },
  weekNow: {
    color: color.text,
  },
  caption: {
    color: color.textFaint,
    fontSize: fontSize.label,
  },
  cell: {
    height: ROW,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  amount: {
    color: color.text,
    fontSize: fontSize.small,
    fontVariant: ["tabular-nums"],
  },
  kg: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  quiet: {
    color: color.textMuted,
    fontWeight: fontWeight.regular,
  },
  none: {
    color: color.textFaint,
    fontSize: fontSize.small,
  },
  hint: {
    ...font.small,
    color: color.textMuted,
    textAlign: "center",
  },
});
