import type { ActivityCalendar } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { fetchActivityCalendar } from "../api/activityCalendar";
import { type FlightBests, fetchFlightBests } from "../api/flightBests";
import { phoneTimeZone } from "../api/gymCalendar";
import { useFollowsDoor } from "../social/followsDoor";

/**
 * What the cards under «Record your flight» show (TASK-305 part R5b): this
 * month's flights, from the calendar of TASK-462 asked for the flights
 * alone, and the bests of the air (part R5a). Asked again when the account's
 * activities change, so a flight saved shows on coming back. Null signed
 * out; each part null until it comes, or when the API said no.
 */
export type FlightData = {
  month: ActivityCalendar | null;
  bests: FlightBests | null;
};

export function useFlightData(fetchFn?: typeof fetch): FlightData | null {
  const { apiUrl, account } = useFollowsDoor();
  const { total } = useActivitiesDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [month, setMonth] = useState<ActivityCalendar | null>(null);
  const [bests, setBests] = useState<FlightBests | null>(null);

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchActivityCalendar(apiUrl, token, phoneTimeZone(), null, "paragliding", {
      fetchFn,
    }).then((outcome) => {
      if (live) {
        setMonth(outcome.kind === "ok" ? outcome.value : null);
      }
    });
    void fetchFlightBests(apiUrl, token, { fetchFn }).then((outcome) => {
      if (live) {
        setBests(outcome.kind === "ok" ? outcome.value : null);
      }
    });
    return () => {
      live = false;
    };
  }, [apiUrl, token, total, fetchFn]);

  return token === null || apiUrl === null ? null : { month, bests };
}
