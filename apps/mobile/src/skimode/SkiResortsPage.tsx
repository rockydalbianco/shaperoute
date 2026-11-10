import type { SkiResort } from "@shaperoute/shared-types";
import { useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { SearchBar } from "../search/SearchBar";
import { ResortList } from "../ski/ResortList";
import { ResortPage } from "../ski/ResortPage";
import { color, font, space } from "../theme/tokens";

type Props = {
  apiUrl: string | null;
};

/**
 * «Resorts», the third page of the ski mode (TASK-429 part A, ADR-0357): the
 * ski resorts that were the «Ski» tab of the search, as they are. Nothing
 * typed, «Your resorts» and those near the phone; a name typed, the resorts
 * with it. A resort opens its page over this one, and «Back» comes here.
 * The new look of «Your resorts» comes with part E.
 */
export function SkiResortsPage({ apiUrl }: Props) {
  const [typed, setTyped] = useState("");
  const [resort, setResort] = useState<SkiResort | null>(null);
  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Text style={styles.title} accessibilityRole="header">
          {t("Resorts")}
        </Text>
        <SearchBar
          value={typed}
          onChange={setTyped}
          onSubmit={() => Keyboard.dismiss()}
          placeholder={t("Ski resorts")}
          testID="ski-resorts-field"
        />
      </View>
      <View style={styles.list}>
        <ResortList typed={typed} apiUrl={apiUrl} onPick={setResort} />
      </View>
      {resort !== null && (
        <ResortPage resort={resort} apiUrl={apiUrl} onBack={() => setResort(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  top: {
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  title: {
    ...font.title,
    color: color.text,
  },
  list: {
    flex: 1,
  },
});
