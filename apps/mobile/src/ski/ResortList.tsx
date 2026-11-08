import type { SkiResort } from "@shaperoute/shared-types";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { accountProblem } from "../account/messages";
import { findSkiResorts, type ResortQuery } from "../api/skiResorts";
import { t } from "../i18n";
import { type PositionState, readPosition } from "../location/useCurrentPosition";
import { SEARCH_DELAY_MS } from "../search/useDrawingSearch";
import { color, font, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { nearDistanceLabel } from "../units/format";
import { useFollowedResorts } from "./useFollowedResorts";

/** From this many letters the resorts are searched by name; below, the
 * nearest. */
export const NAME_FROM_LETTERS = 2;

/** What the list has to show. */
export type ResortsShown =
  /** The position is being read, for the nearest. */
  | { kind: "locating" }
  /** No position: only a name finds resorts. */
  | { kind: "no_position"; denied: boolean }
  | { kind: "loading" }
  | { kind: "ready"; resorts: SkiResort[] }
  | { kind: "failed"; problem: string };

type Options = {
  fetchFn?: typeof fetch;
  apiKey?: string | null;
  /** Where the phone is: read once, the first time the nearest are asked. */
  locate?: () => Promise<PositionState>;
};

/** The name asked, or null for the nearest. */
export function nameOf(typed: string): string | null {
  const name = typed.trim();
  return name.length >= NAME_FROM_LETTERS ? name : null;
}

/**
 * The ski resorts of the tab «Ski» (TASK-406 part C, ADR-0338): the
 * nearest while nothing is typed, then those with the name typed, asked
 * SEARCH_DELAY_MS after the last letter. Only the answer to the last
 * request is kept.
 */
export function useResortSearch(
  typed: string,
  apiUrl: string | null,
  { fetchFn, apiKey, locate = readPosition }: Options = {},
): { byName: boolean; shown: ResortsShown } {
  const [asked, setAsked] = useState(() => nameOf(typed));
  useEffect(() => {
    const timer = setTimeout(() => setAsked(nameOf(typed)), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  const [position, setPosition] = useState<PositionState>({ status: "loading" });
  const located = useRef(false);
  useEffect(() => {
    if (asked !== null || located.current) {
      return;
    }
    located.current = true;
    let gone = false;
    void locate().then((read) => {
      if (!gone) {
        setPosition(read);
      }
    });
    return () => {
      gone = true;
      located.current = false;
    };
  }, [asked, locate]);

  const query: ResortQuery | null =
    asked !== null
      ? { name: asked }
      : position.status === "ok"
        ? { near: position.point }
        : null;
  const queryKey = query === null || apiUrl === null ? null : JSON.stringify(query);
  const [read, setRead] = useState<{ key: string; shown: ResortsShown } | null>(null);
  const last = useRef(0);
  useEffect(() => {
    if (queryKey === null || query === null || apiUrl === null) {
      return;
    }
    const request = ++last.current;
    void findSkiResorts(apiUrl, query, { fetchFn, key: apiKey }).then((outcome) => {
      if (request !== last.current) {
        return;
      }
      setRead({
        key: queryKey,
        shown:
          outcome.kind === "ok"
            ? { kind: "ready", resorts: outcome.value.resorts }
            : { kind: "failed", problem: accountProblem(outcome) },
      });
    });
    // `query` is the same as long as its key is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, apiKey, fetchFn, queryKey]);

  const byName = asked !== null;
  if (!byName && position.status === "loading") {
    return { byName, shown: { kind: "locating" } };
  }
  if (!byName && (position.status === "denied" || position.status === "unavailable")) {
    return {
      byName,
      shown: { kind: "no_position", denied: position.status === "denied" },
    };
  }
  if (apiUrl === null) {
    return { byName, shown: { kind: "ready", resorts: [] } };
  }
  return {
    byName,
    shown: read !== null && read.key === queryKey ? read.shown : { kind: "loading" },
  };
}

type Props = Options & {
  typed: string;
  apiUrl: string | null;
  onPick: (resort: SkiResort) => void;
};

/** The resorts found, a row each: the name, the region and how far it is. */
export function ResortList({ typed, apiUrl, onPick, ...options }: Props) {
  const { byName, shown } = useResortSearch(typed, apiUrl, options);
  // «Your resorts» first, while nothing is typed (part D3).
  const { followed } = useFollowedResorts();
  return (
    <ScrollView
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      testID="ski-resorts"
    >
      {!byName && followed.length > 0 && (
        <>
          <Text style={styles.heading} accessibilityRole="header">
            {t("Your resorts")}
          </Text>
          {followed.map((resort) => (
            <ResortRow
              key={resort.id}
              resort={resort}
              onPick={onPick}
              testID={`followed-${resort.id}`}
            />
          ))}
        </>
      )}
      <Text style={styles.heading} accessibilityRole="header">
        {byName ? t("Ski resorts") : t("Near you")}
      </Text>
      {shown.kind === "locating" ? (
        <Text style={styles.note}>{t("Finding your position…")}</Text>
      ) : shown.kind === "no_position" ? (
        shown.denied && <Text style={styles.note}>{t("Location is off")}</Text>
      ) : shown.kind === "loading" ? (
        <ActivityIndicator style={styles.wait} color={color.textMuted} />
      ) : shown.kind === "failed" ? (
        <Text style={styles.note}>{shown.problem}</Text>
      ) : shown.resorts.length === 0 ? (
        byName && <Text style={styles.note}>{t("No ski resort with this name.")}</Text>
      ) : (
        shown.resorts.map((resort) => (
          <ResortRow key={resort.id} resort={resort} onPick={onPick} />
        ))
      )}
    </ScrollView>
  );
}

function ResortRow({
  resort,
  onPick,
  testID = `resort-${resort.id}`,
}: {
  resort: SkiResort;
  onPick: (resort: SkiResort) => void;
  testID?: string;
}) {
  const where = [
    resort.region,
    resort.away_m === null ? null : nearDistanceLabel(resort.away_m),
  ].filter((part): part is string => part !== null && part !== "");
  return (
    <Pressable
      style={styles.row}
      onPress={() => onPick(resort)}
      accessibilityRole="button"
      testID={testID}
    >
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {resort.name}
        </Text>
        {where.length > 0 && (
          <Text style={styles.where} numberOfLines={1}>
            {where.join(" · ")}
          </Text>
        )}
      </View>
      <Text style={styles.chevron} importantForAccessibility="no">
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  heading: {
    ...font.label,
    color: color.textMuted,
    paddingVertical: space.sm,
  },
  note: {
    ...font.small,
    color: color.textMuted,
    paddingVertical: space.md,
  },
  wait: {
    paddingVertical: space.lg,
  },
  row: {
    minHeight: MIN_TAP_SIZE + space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  rowText: {
    flex: 1,
  },
  name: {
    ...font.body,
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
  where: {
    ...font.small,
    color: color.textMuted,
  },
  chevron: {
    ...font.body,
    color: color.textFaint,
  },
});
