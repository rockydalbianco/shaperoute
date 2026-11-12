import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ActivityCalendarSheet } from "../activities/ActivityCalendar";
import { useActivitiesDoor } from "../activities/activitiesDoor";
import { space } from "../theme/tokens";
import { useUnits } from "../units/useUnits";
import { FlightBests } from "./FlightBests";
import { FlightsMonth } from "./FlightsMonth";
import { ReadyToFly } from "./ReadyToFly";
import { useFlightData } from "./useFlightData";
import { type GpsState, useGpsAccuracy, type WatchAccuracy } from "./useGpsAccuracy";

type Props = {
  /** For the tests: the API asked with this, and the GPS read with this. */
  fetchFn?: typeof fetch;
  watch?: WatchAccuracy;
};

/**
 * What «Draw» shows under «Record your flight» (TASK-305 part R5b, the
 * user's choices of 2026-11-12): «Ready to fly» first, what matters before
 * the start; then «Your flights», the month, and «Your best flights». The
 * month and the bests need an account; the GPS does not.
 */
export function FlightPage({ fetchFn, watch }: Props) {
  const data = useFlightData(fetchFn);
  const gps: GpsState = useGpsAccuracy(true, watch);
  const units = useUnits();
  const activities = useActivitiesDoor();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.page} testID="flight-page">
      <ReadyToFly gps={gps} signedIn={data !== null} />
      {data?.month && (
        <FlightsMonth calendar={data.month} onOpen={() => setOpen(true)} />
      )}
      {data?.bests && (
        <FlightBests
          bests={data.bests}
          units={units}
          onOpen={(id) => activities.open({ id })}
        />
      )}
      <ActivityCalendarSheet
        visible={open}
        onClose={() => setOpen(false)}
        sport="paragliding"
        fetchFn={fetchFn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: space.md,
  },
});
