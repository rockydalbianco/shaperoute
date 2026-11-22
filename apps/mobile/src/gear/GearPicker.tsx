import {
  type Gear,
  GEAR_MAX_ON_ACTIVITY,
  type RunActivity,
} from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { sessionEnded } from "../account/messages";
import { fetchMyGear } from "../api/gear";
import { t } from "../i18n";
import { FilterChip } from "../search/FilterChip";
import { useFollowsDoor } from "../social/followsDoor";
import { color, fontSize, space } from "../theme/tokens";
import { gearTitle, lookOf } from "./gearKinds";
import { GEAR_ON } from "./gearOn";
import type { GearApi } from "./GearSetting";

/**
 * The items of the account, read once from the API for the session signed
 * in (TASK-486 part C): null until they come, and for good on an API
 * without gear (404), without an account or with GEAR_ON off.
 */
export function useMyGear(
  api: Partial<GearApi> = {},
  on: boolean = GEAR_ON,
): Gear[] | null {
  const { apiUrl, account } = useFollowsDoor();
  const baseUrl = api.baseUrl === undefined ? apiUrl : api.baseUrl;
  const { fetchFn, key } = api;
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [mine, setMine] = useState<{ token: string; gear: Gear[] } | null>(null);
  useEffect(() => {
    if (!on || token === null || baseUrl === null) {
      return;
    }
    let live = true;
    void fetchMyGear(baseUrl, token, { fetchFn, key }).then((outcome) => {
      if (!live) {
        return;
      }
      if (outcome.kind === "ok" && outcome.value !== null) {
        setMine({ token, gear: outcome.value });
      } else if (sessionEnded(outcome)) {
        onSessionEnded(token);
      }
    });
    return () => {
      live = false;
    };
  }, [baseUrl, fetchFn, key, on, onSessionEnded, token]);
  return on && mine !== null && mine.token === token ? mine.gear : null;
}

/** The items in use whose defaults have `activity`, in the list's order. */
export function defaultsFor(gear: readonly Gear[], activity: RunActivity): string[] {
  return gear
    .filter((item) => !item.retired && (item.defaults ?? []).includes(activity))
    .slice(0, GEAR_MAX_ON_ACTIVITY)
    .map((item) => item.id);
}

/** `ids` with `id` in or out; none in past what an activity takes. */
export function toggled(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) {
    return ids.filter((other) => other !== id);
  }
  return ids.length >= GEAR_MAX_ON_ACTIVITY ? [...ids] : [...ids, id];
}

export type GearChoice = {
  /** The items to choose from; null: no «Gear» row. */
  gear: Gear[] | null;
  /** The ids chosen. */
  chosen: string[];
  toggle: (id: string) => void;
};

/**
 * The gear of an activity at its end: the defaults of its sport, chosen
 * until a chip is tapped; a change of sport then picks that sport's
 * defaults, until the first tap. Retired items are not offered. An
 * activity added from a file starts with none: an old activity is linked
 * only by hand (ADR-0393).
 */
export function useGearChoice(
  activity: RunActivity,
  {
    api,
    on,
    withDefaults = true,
  }: { api?: Partial<GearApi>; on?: boolean; withDefaults?: boolean } = {},
): GearChoice {
  const mine = useMyGear(api, on);
  const [touched, setTouched] = useState<string[] | null>(null);
  const gear = mine === null ? null : mine.filter((item) => !item.retired);
  const chosen =
    touched ?? (gear === null || !withDefaults ? [] : defaultsFor(gear, activity));
  return {
    gear,
    chosen,
    toggle: (id) => setTouched(toggled(chosen, id)),
  };
}

type Props = {
  gear: readonly Gear[] | null;
  chosen: readonly string[];
  toggle: (id: string) => void;
};

/**
 * «Gear» in a form (TASK-486 part C, ADR-0393): a chip for each item, with
 * its emoji and its name, the chosen ones yellow. Nothing without items:
 * the list is made in «Settings», «Gear».
 */
export function GearPicker({ gear, chosen, toggle }: Props) {
  if (gear === null || gear.length === 0) {
    return null;
  }
  return (
    <View style={styles.block} testID="gear-picker">
      <Text style={styles.label}>{t("Gear")}</Text>
      <View style={styles.chips}>
        {gear.map((item) => (
          <FilterChip
            key={item.id}
            label={`${lookOf(item.kind).emoji} ${gearTitle(item)}`}
            selected={chosen.includes(item.id)}
            onPress={() => toggle(item.id)}
            testID={`gear-chip-${item.id}`}
          />
        ))}
      </View>
      {chosen.length >= GEAR_MAX_ON_ACTIVITY && (
        <Text style={styles.label}>
          {t("Up to {count} items on an activity.", {
            count: String(GEAR_MAX_ON_ACTIVITY),
          })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.xs,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs,
  },
});
