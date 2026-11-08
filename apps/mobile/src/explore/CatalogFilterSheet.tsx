import type { Activity } from "@shaperoute/shared-types";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t, tPlural } from "../i18n";
import { activityName } from "../social/PublicParts";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Hairline } from "../ui/Hairline";
import { SheetModal } from "../ui/SheetModal";
import { Tap } from "../ui/Tap";
import { wholeDistanceLabel } from "../units/format";
import type { Units } from "../units/units";
import {
  type CatalogCategory,
  type CatalogRoute,
  categoryName,
  countryName,
} from "./catalog";
import {
  activitiesOf,
  type CatalogFilter,
  categoriesOf,
  citiesOf,
  countriesOf,
  distancesOf,
  filterCatalog,
  NO_FILTER,
} from "./catalogFilters";
import { cityName } from "./recommendedRoutes";

type Props = {
  visible: boolean;
  /** Every route of the catalog: the choices and the count come from them. */
  routes: readonly CatalogRoute[];
  filter: CatalogFilter;
  units: Units;
  /** «Show N drawings»: the filter chosen. */
  onApply: (filter: CatalogFilter) => void;
  onClose: () => void;
};

/**
 * The filters of the catalog in one sheet from the bottom (TASK-420,
 * ADR-0348): country, city, category, distance and sport as chips; a
 * chosen one is light. A country chosen narrows the cities; several
 * distances may be on at once. The yellow button says how many drawings
 * match before anything changes on the page; «Clear» puts every filter
 * back. Nothing is applied until the button.
 */
export function CatalogFilterSheet({
  visible,
  routes,
  filter,
  units,
  onApply,
  onClose,
}: Props) {
  return (
    <SheetModal visible={visible} onRequestClose={onClose} dim testID="catalog-filters">
      {/* Mounted with the sheet: each opening starts from the page's filter. */}
      <SheetBody
        routes={routes}
        filter={filter}
        units={units}
        onApply={onApply}
        onClose={onClose}
      />
    </SheetModal>
  );
}

function SheetBody({
  routes,
  filter,
  units,
  onApply,
  onClose,
}: Omit<Props, "visible">) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<CatalogFilter>(filter);
  const count = filterCatalog(routes, draft).length;
  const countries = countriesOf(routes);
  const cities = citiesOf(routes, draft.country);
  const categories = categoriesOf(routes);
  const distances = distancesOf(routes);
  const activities = activitiesOf(routes);
  const set = (change: Partial<CatalogFilter>) => setDraft({ ...draft, ...change });
  const toggleDistance = (distance: number) =>
    set({
      distances: draft.distances.includes(distance)
        ? draft.distances.filter((d) => d !== distance)
        : [...draft.distances, distance].sort((a, b) => a - b),
    });
  return (
    <View style={styles.fill} pointerEvents="box-none">
      {/* The screen over the sheet closes it, as its «Close». */}
      <Tap
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("Close")}
        testID="catalog-filters-backdrop"
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
        <View style={styles.grab} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.sections}
          keyboardShouldPersistTaps="handled"
        >
          <Section title={t("Country")}>
            <Chip
              label={t("All")}
              on={draft.country === null}
              onPress={() => set({ country: null, city: null })}
            />
            {countries.map((country) => (
              <Chip
                key={country}
                label={countryName(country)}
                on={draft.country === country}
                onPress={() =>
                  set({
                    country,
                    // A city of another country goes with its country.
                    city: citiesOf(routes, country).includes(draft.city ?? "")
                      ? draft.city
                      : null,
                  })
                }
              />
            ))}
          </Section>
          <Hairline />
          <Section title={t("City")}>
            <Chip
              label={t("All")}
              on={draft.city === null}
              onPress={() => set({ city: null })}
            />
            {cities.map((city) => (
              <Chip
                key={city}
                label={cityName(city)}
                on={draft.city === city}
                onPress={() => set({ city })}
              />
            ))}
          </Section>
          <Hairline />
          <Section title={t("Category")}>
            <Chip
              label={t("All")}
              on={draft.category === null}
              onPress={() => set({ category: null })}
            />
            {categories.map((category: CatalogCategory) => (
              <Chip
                key={category}
                label={categoryName(category)}
                on={draft.category === category}
                onPress={() => set({ category })}
              />
            ))}
          </Section>
          <Hairline />
          <Section
            title={t("Distance")}
            note={t("The drawings are planned at {distances}.", {
              distances: distances.map((d) => wholeDistanceLabel(d, units)).join(", "),
            })}
          >
            <Chip
              label={t("Any")}
              on={draft.distances.length === 0}
              onPress={() => set({ distances: [] })}
            />
            {distances.map((distance) => (
              <Chip
                key={distance}
                label={wholeDistanceLabel(distance, units)}
                on={draft.distances.includes(distance)}
                onPress={() => toggleDistance(distance)}
              />
            ))}
          </Section>
          <Hairline />
          <Section title={t("Sport")}>
            <Chip
              label={t("All")}
              on={draft.activity === null}
              onPress={() => set({ activity: null })}
            />
            {activities.map((activity: Activity) => (
              <Chip
                key={activity}
                label={activityName(activity)}
                on={draft.activity === activity}
                onPress={() => set({ activity })}
              />
            ))}
          </Section>
        </ScrollView>
        <View style={styles.buttons}>
          <Tap
            style={styles.button}
            onPress={() => setDraft(NO_FILTER)}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{t("Clear")}</Text>
          </Tap>
          <Tap
            style={[styles.button, styles.show]}
            onPress={() => onApply(draft)}
            accessibilityRole="button"
            testID="catalog-filters-show"
          >
            <Text style={[styles.buttonText, styles.showText]}>
              {tPlural(count, "Show {count} drawing", "Show {count} drawings")}
            </Text>
          </Tap>
        </View>
      </View>
    </View>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {note !== undefined && <Text style={styles.note}>{note}</Text>}
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

/** A choice: light when on, as the city chips of «Explore». */
export function Chip({
  label,
  on,
  onPress,
  testID,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Tap
      style={[styles.chip, on && styles.chipOn]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      testID={testID}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    maxHeight: "85%",
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  grab: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.borderStrong,
  },
  scroll: {
    flexGrow: 0,
  },
  sections: {
    gap: space.md,
  },
  section: {
    gap: space.sm,
  },
  sectionTitle: {
    ...font.heading,
    color: color.text,
  },
  note: {
    ...font.small,
    color: color.textMuted,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: space.md + 2,
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  chipOn: {
    backgroundColor: color.text,
    borderColor: color.text,
  },
  chipText: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
  chipTextOn: {
    color: color.background,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  // Yellow: the one control that produces the list (ADR-0046).
  show: {
    flex: 2,
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  showText: {
    color: color.onAccent,
    fontWeight: fontWeight.bold,
  },
});
