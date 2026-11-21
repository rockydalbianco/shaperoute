import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { fontWeight, type Palette } from "../theme/tokens";
import {
  type FlightPrefs,
  GRID_COLUMNS,
  GRID_ROWS,
  type Page,
  pagesOf,
  profileName,
  type UnitChoice,
  WIDGET_NAME,
  WIDGETS,
} from "./flightLayout";
import { UNIT_LABEL } from "./flightUnits";
import {
  addPage,
  addProfile,
  addWidget,
  deleteProfile,
  type Direction,
  duplicateProfile,
  moveWidget,
  removePage,
  removeWidget,
  resetProfile,
  resizeWidget,
  setWidgetUnit,
  unitsFor,
  withPage,
  withPages,
} from "./layoutEdit";
import { layoutPickerAvailable, pickLayout, shareLayout } from "./layoutFile";

/**
 * The editor of the flight screen (TASK-479 part B2, ADR-0388): a long
 * press on a widget opens it, on that widget. The page as a grid of names;
 * a touch picks a widget; big buttons (gloves) move it a cell at a time,
 * change its size and its unit, take it away; pages and layouts are added,
 * copied, set back to their preset, sent and loaded as a file. Every change
 * is kept at once, on the phone.
 */

/** Targets for gloved fingers, points (as `FlightScreen`'s). */
const TARGET = 64;
const GAP = 6;

type Props = {
  prefs: FlightPrefs;
  onChange: (prefs: FlightPrefs) => void;
  onDone: () => void;
  palette: Palette;
  /** Where the long press was. */
  startPage: number;
  startIndex: number | null;
};

function Button({
  label,
  onPress,
  palette,
  testID,
  wide = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  palette: Palette;
  testID?: string;
  wide?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[
        styles.button,
        wide && styles.wide,
        {
          backgroundColor: palette.surfaceRaised,
          borderColor: palette.borderStrong,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonText, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const ARROWS: readonly { direction: Direction; label: string }[] = [
  { direction: "left", label: "←" },
  { direction: "up", label: "↑" },
  { direction: "down", label: "↓" },
  { direction: "right", label: "→" },
];

export function FlightEditor({
  prefs,
  onChange,
  onDone,
  palette,
  startPage,
  startIndex,
}: Props) {
  const pages = pagesOf(prefs);
  const [pageIndex, setPageIndex] = useState(Math.min(startPage, pages.length - 1));
  const [selected, setSelected] = useState<number | null>(startIndex);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [grid, setGrid] = useState({ width: 0, height: 0 });
  const at = Math.min(pageIndex, pages.length - 1);
  const page = pages[at];
  const cell = selected !== null ? (page[selected] ?? null) : null;

  const change = (next: FlightPrefs | null, failed?: string) => {
    if (next === null) {
      setNote(failed ?? null);
      return;
    }
    setNote(null);
    onChange(next);
  };
  const changePage = (next: Page | null, failed?: string) =>
    change(next === null ? null : withPage(prefs, at, next), failed);

  const move = (direction: Direction) => {
    if (selected !== null) {
      changePage(moveWidget(page, selected, direction), t("No room there."));
    }
  };
  const nextUnit = () => {
    if (cell === null || selected === null) {
      return;
    }
    const choices: (UnitChoice | null)[] = [null, ...unitsFor(cell)];
    const now = choices.indexOf(cell.unit ?? null);
    changePage(setWidgetUnit(page, selected, choices[(now + 1) % choices.length]));
  };
  const confirm = (title: string, yes: string, then: () => void) =>
    Alert.alert(title, undefined, [
      { text: t("Cancel"), style: "cancel" },
      { text: yes, style: "destructive", onPress: then },
    ]);
  const load = async () => {
    const picked = await pickLayout();
    if ("profile" in picked) {
      change(addProfile(prefs, picked.profile), t("No room for another layout."));
      setPageIndex(0);
      setSelected(null);
    } else if ("error" in picked) {
      setNote(
        picked.error === "newer"
          ? t("This layout is from a newer MuW: update the app.")
          : picked.error === "not-a-layout"
            ? t("This file is not a MuW layout.")
            : t("MuW could not read this file."),
      );
    }
  };

  const cellW = (grid.width - GAP * (GRID_COLUMNS + 1)) / GRID_COLUMNS;
  const cellH = (grid.height - GAP * (GRID_ROWS + 1)) / GRID_ROWS;
  const name = profileName(prefs.profiles[prefs.current]);

  return (
    <View style={styles.editor} testID="flight-editor">
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          style={[styles.done, { backgroundColor: palette.accent }]}
          testID="flight-editor-done"
        >
          <Text style={[styles.doneText, { color: palette.onAccent }]}>
            {t("Done")}
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={styles.pageBar}>
        <Button
          label="‹"
          onPress={() => {
            setPageIndex(Math.max(0, at - 1));
            setSelected(null);
          }}
          disabled={at === 0}
          palette={palette}
          testID="flight-editor-page-back"
        />
        <Text style={[styles.pageText, { color: palette.text }]}>
          {t("Page {n} of {count}", { n: String(at + 1), count: String(pages.length) })}
        </Text>
        <Button
          label="›"
          onPress={() => {
            setPageIndex(Math.min(pages.length - 1, at + 1));
            setSelected(null);
          }}
          disabled={at >= pages.length - 1}
          palette={palette}
          testID="flight-editor-page-next"
        />
      </View>
      <View
        style={styles.grid}
        onLayout={(event) => setGrid(event.nativeEvent.layout)}
        testID="flight-editor-grid"
      >
        {grid.width > 0
          ? page.map((one, index) => (
              <Pressable
                key={`${one.widget}-${one.col}-${one.row}`}
                accessibilityRole="button"
                accessibilityState={{ selected: index === selected }}
                onPress={() => setSelected(index)}
                testID={`flight-editor-cell-${one.widget}`}
                style={[
                  styles.cell,
                  {
                    left: GAP + one.col * (cellW + GAP),
                    top: GAP + one.row * (cellH + GAP),
                    width: cellW * one.w + GAP * (one.w - 1),
                    height: cellH * one.h + GAP * (one.h - 1),
                    backgroundColor:
                      index === selected ? palette.accent : palette.surface,
                    borderColor:
                      index === selected ? palette.accent : palette.borderStrong,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cellText,
                    { color: index === selected ? palette.onAccent : palette.text },
                  ]}
                  numberOfLines={2}
                >
                  {t(WIDGET_NAME[one.widget])}
                  {one.unit !== undefined ? ` · ${UNIT_LABEL[one.unit]}` : ""}
                </Text>
              </Pressable>
            ))
          : null}
      </View>
      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        {note !== null ? (
          <Text style={[styles.note, { color: palette.warning }]}>{note}</Text>
        ) : null}
        {cell !== null && selected !== null ? (
          <>
            <View style={styles.row}>
              {ARROWS.map((arrow) => (
                <Button
                  key={arrow.direction}
                  label={arrow.label}
                  onPress={() => move(arrow.direction)}
                  palette={palette}
                  testID={`flight-editor-move-${arrow.direction}`}
                />
              ))}
            </View>
            <View style={styles.row}>
              <Button
                label={t("Size")}
                onPress={() =>
                  changePage(
                    resizeWidget(page, selected),
                    t("No room for another size."),
                  )
                }
                palette={palette}
                testID="flight-editor-size"
              />
              {unitsFor(cell).length > 0 ? (
                <Button
                  label={`${t("Unit")}: ${cell.unit !== undefined ? UNIT_LABEL[cell.unit] : t("Default")}`}
                  onPress={nextUnit}
                  palette={palette}
                  testID="flight-editor-unit"
                  wide
                />
              ) : null}
              <Button
                label={t("Remove")}
                onPress={() => {
                  changePage(removeWidget(page, selected));
                  setSelected(null);
                }}
                palette={palette}
                testID="flight-editor-remove"
              />
            </View>
          </>
        ) : (
          <Text style={[styles.hintText, { color: palette.textMuted }]}>
            {t("Touch a widget to move it, size it or take it away.")}
          </Text>
        )}
        <View style={styles.row}>
          <Button
            label={t("Add")}
            onPress={() => setAdding(true)}
            palette={palette}
            testID="flight-editor-add"
          />
          <Button
            label={t("Add page")}
            onPress={() => {
              const next = addPage(pages);
              change(
                next === null ? null : withPages(prefs, next),
                t("No room for another page."),
              );
              if (next !== null) {
                setPageIndex(next.length - 1);
                setSelected(null);
              }
            }}
            palette={palette}
            testID="flight-editor-add-page"
            wide
          />
          <Button
            label={t("Remove page")}
            disabled={pages.length <= 1}
            onPress={() => {
              change(withPages(prefs, removePage(pages, at)));
              setPageIndex(Math.max(0, at - 1));
              setSelected(null);
            }}
            palette={palette}
            testID="flight-editor-remove-page"
            wide
          />
        </View>
        <View style={styles.row}>
          <Button
            label={t("Duplicate")}
            onPress={() =>
              change(duplicateProfile(prefs), t("No room for another layout."))
            }
            palette={palette}
            testID="flight-editor-duplicate"
          />
          <Button
            label={t("Back to preset")}
            onPress={() =>
              confirm(
                t("Undo every change to this layout?"),
                t("Back to preset"),
                () => {
                  change(resetProfile(prefs));
                  setPageIndex(0);
                  setSelected(null);
                },
              )
            }
            palette={palette}
            testID="flight-editor-reset"
            wide
          />
          <Button
            label={t("Delete")}
            disabled={prefs.profiles.length <= 1}
            onPress={() =>
              confirm(t("Delete this layout?"), t("Delete"), () => {
                change(deleteProfile(prefs));
                setPageIndex(0);
                setSelected(null);
              })
            }
            palette={palette}
            testID="flight-editor-delete"
          />
        </View>
        <View style={styles.row}>
          <Button
            label={t("Send file")}
            onPress={async () => {
              if (!(await shareLayout(prefs.profiles[prefs.current], name))) {
                setNote(t("MuW could not share the file."));
              }
            }}
            palette={palette}
            testID="flight-editor-send"
            wide
          />
          {layoutPickerAvailable() ? (
            <Button
              label={t("Load file")}
              onPress={load}
              palette={palette}
              testID="flight-editor-load"
              wide
            />
          ) : null}
        </View>
      </ScrollView>
      {adding ? (
        <View
          style={[styles.adding, { backgroundColor: palette.background }]}
          testID="flight-editor-widgets"
        >
          <ScrollView contentContainerStyle={styles.addingContent}>
            {WIDGETS.map((widget) => (
              <Button
                key={widget}
                label={t(WIDGET_NAME[widget])}
                onPress={() => {
                  const next = addWidget(page, widget);
                  changePage(next, t("No room on this page."));
                  setSelected(next === null ? selected : next.length - 1);
                  setAdding(false);
                }}
                palette={palette}
                testID={`flight-editor-add-${widget}`}
                wide
              />
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={() => setAdding(false)}
            style={[styles.done, styles.cancel, { backgroundColor: palette.accent }]}
          >
            <Text style={[styles.doneText, { color: palette.onAccent }]}>
              {t("Cancel")}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { flex: 1 },
  bar: { flexDirection: "row", alignItems: "center", gap: 12, padding: GAP },
  done: {
    minHeight: TARGET,
    minWidth: TARGET * 1.6,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { fontSize: 20, fontWeight: fontWeight.bold },
  title: { flex: 1, fontSize: 22, fontWeight: fontWeight.bold },
  pageBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GAP,
  },
  pageText: { fontSize: 18, fontWeight: fontWeight.semibold },
  grid: { flex: 1 },
  cell: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 12,
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  cellText: { fontSize: 14, fontWeight: fontWeight.semibold, textAlign: "center" },
  panel: { maxHeight: "42%" },
  panelContent: { padding: GAP, gap: GAP },
  row: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  button: {
    minHeight: TARGET,
    minWidth: TARGET,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  wide: { flexGrow: 1 },
  buttonText: { fontSize: 18, fontWeight: fontWeight.bold },
  note: { fontSize: 16, fontWeight: fontWeight.semibold },
  hintText: { fontSize: 15, paddingVertical: 8 },
  adding: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    gap: 12,
  },
  addingContent: { gap: GAP },
  cancel: { alignSelf: "stretch" },
});
