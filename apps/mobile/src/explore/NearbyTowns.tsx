import type { LatLon } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { decimal, t } from "../i18n";
import type { Place } from "../places/photon";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import { fetchNearbyCities, knownNearby, type NearbyCity } from "./nearbyCities";
import { type SampleOptions, useNearbySamples } from "./nearbySamples";
import { cityShort } from "./presets";
import { CardMapsCredit, RouteCard } from "./RouteCard";

/** A card's share of the section: two whole and the edge of the third, so
 * the row is seen to go on. */
const CARD_SHARE = 0.42;

type Props = {
  apiUrl: string | null;
  /** The start «Near me» is about. */
  near: LatLon | null;
  /** How wide the page is between its margins. */
  width: number;
  /** A town tapped: it opens as a city chosen. */
  onCity: (city: Place) => void;
  /** Injected in tests. */
  fetchFn?: typeof fetch;
  request?: SampleOptions["request"];
  /** The credit of the maps under the drawings, unless the page has it. */
  credit?: boolean;
};

/** «2.9 km» from the start; a town further than 10 km without decimals. */
export function awayKm(awayM: number): string {
  const km = awayM / 1000;
  return km < 10 ? decimal(km) : String(Math.round(km));
}

/**
 * Under «Near me» (TASK-236): the towns around the start, six at most, a
 * card each in a row to scroll. A card shows a shape drawn in its town,
 * when the API has drawn it, and opens the town as a city of «Explore».
 * Nothing while the towns are not known, and where there are none.
 */
export function NearbyTowns({
  apiUrl,
  near,
  width,
  onCity,
  fetchFn,
  request,
  credit = true,
}: Props) {
  const lat = near?.[0];
  const lon = near?.[1];
  const [fetched, setFetched] = useState<{ key: string; towns: NearbyCity[] } | null>(
    null,
  );
  const key =
    apiUrl === null || lat === undefined || lon === undefined
      ? null
      : `${apiUrl} ${lat},${lon}`;
  useEffect(() => {
    if (key === null || apiUrl === null || lat === undefined || lon === undefined) {
      return;
    }
    const controller = new AbortController();
    void fetchNearbyCities(apiUrl, [lat, lon], {
      ...(fetchFn ? { fetchFn } : {}),
      signal: controller.signal,
    }).then((towns) => {
      if (!controller.signal.aborted && towns !== null) {
        // The same towns again are no news: nothing is drawn again.
        setFetched((was) =>
          was?.key === key && was.towns === towns ? was : { key, towns },
        );
      }
    });
    return () => controller.abort();
  }, [key, apiUrl, lat, lon, fetchFn]);
  // Fetched before, in this run of the app: there at once, no empty moment.
  const towns =
    key === null || apiUrl === null || lat === undefined || lon === undefined
      ? NO_TOWNS
      : fetched?.key === key
        ? fetched.towns
        : (knownNearby(apiUrl, [lat, lon]) ?? NO_TOWNS);
  const samples = useNearbySamples(apiUrl, towns, { request });
  if (towns.length === 0) {
    return null;
  }
  const card = Math.round(width * CARD_SHARE);
  const drawn = samples.some(
    (sample) =>
      (sample.status === "ready" || sample.status === "drawing") &&
      sample.route !== null,
  );
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t("NEARBY TOWNS")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {towns.map((town, i) => {
            const sample = samples[i];
            const route =
              sample.status === "ready" || sample.status === "drawing"
                ? sample.route
                : null;
            const name = cityShort(town.label);
            const away = t("{km} km away", { km: awayKm(town.away_m) });
            return (
              <RouteCard
                key={town.label}
                width={card}
                line={route?.preview ?? null}
                title={name}
                detail={
                  route === null && sample.status !== "failed"
                    ? `${away} · ${t("Drawing…")}`
                    : away
                }
                map
                onPress={() => onCity({ label: town.label, point: town.point })}
                accessibilityLabel={t("{town}, {km} km away", {
                  town: name,
                  km: awayKm(town.away_m),
                })}
              />
            );
          })}
        </View>
      </ScrollView>
      {credit && drawn && <CardMapsCredit />}
    </View>
  );
}

const NO_TOWNS: NearbyCity[] = [];

const styles = StyleSheet.create({
  section: {
    gap: space.sm,
  },
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
