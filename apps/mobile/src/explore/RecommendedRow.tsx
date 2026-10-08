import type { LatLon } from "@shaperoute/shared-types";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { loadSession } from "../account/sessionStore";
import { fetchRecommendedRow } from "../api/recommended";
import { t } from "../i18n";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import type { RecommendedRoute } from "./recommendedRoutes";

/** A card's share of the page: two whole and the edge of the third, as in
 * «NEARBY TOWNS», so the row is seen to go on. */
export const CARD_SHARE = 0.42;

type Props = {
  apiUrl: string | null;
  /** Where the routes start near: the start, or the city chosen. */
  near: LatLon | null;
  /** How wide the page is between its margins. */
  width: number;
  /** The card of a route, as the page's other routes have it. */
  card: (route: RecommendedRoute, width: number) => ReactElement;
  /** The token of the account on this phone; null signed out. */
  readToken?: () => string | null;
  fetchFn?: typeof fetch;
};

const NO_ROUTES: RecommendedRoute[] = [];

function sessionToken(): string | null {
  return loadSession()?.token ?? null;
}

/**
 * «Recommended» (TASK-092, ADR-0229): the routes the API recommends near
 * the point, the best drawn first, then the most liked and run, in one row
 * that scrolls. Nothing at all without an account, an API, a point, or
 * routes: the page goes on as before.
 */
export function RecommendedRow({
  apiUrl,
  near,
  width,
  card,
  readToken = sessionToken,
  fetchFn,
}: Props) {
  const lat = near?.[0];
  const lon = near?.[1];
  const key =
    apiUrl === null || lat === undefined || lon === undefined
      ? null
      : `${apiUrl} ${lat},${lon}`;
  // The row of one point: another point shows none until its own.
  const [row, setRow] = useState<{ key: string; routes: RecommendedRoute[] } | null>(
    null,
  );

  // Read once for each point, from the keychain: signed in since, the next
  // point has the row.
  const token = useMemo(() => (key === null ? null : readToken()), [key, readToken]);

  useEffect(() => {
    if (
      key === null ||
      token === null ||
      apiUrl === null ||
      lat === undefined ||
      lon === undefined
    ) {
      return;
    }
    const controller = new AbortController();
    void fetchRecommendedRow(apiUrl, [lat, lon], token, {
      fetchFn,
      signal: controller.signal,
    }).then((routes) => {
      if (!controller.signal.aborted) {
        setRow({ key, routes });
      }
    });
    return () => controller.abort();
  }, [key, token, apiUrl, lat, lon, fetchFn]);

  const routes =
    token !== null && row !== null && row.key === key ? row.routes : NO_ROUTES;
  if (routes.length === 0) {
    return null;
  }
  const cardWidth = Math.round(width * CARD_SHARE);
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t("RECOMMENDED")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>{routes.map((route) => card(route, cardWidth))}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.sm,
  },
  // As «NEARBY TOWNS» and «NEAR …».
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: "row",
    gap: space.md,
  },
});
