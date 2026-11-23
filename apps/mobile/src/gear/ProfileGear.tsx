import type { Gear } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { sessionEnded } from "../account/messages";
import { fetchProfileGear } from "../api/profileGear";
import { t } from "../i18n";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import { GEAR_ON } from "./gearOn";
import { GearRow } from "./GearRow";
import { GearSheet } from "./GearSheet";

type Props = {
  apiUrl: string;
  token: string;
  publicId: string;
  /** Whose profile, for «Report» and «Block»; null: one's own. */
  owner: { public_id: string; username: string } | null;
  onSessionEnded: (token: string) => void;
  /** For the tests: the fake fetch, and GEAR_ON. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
  on?: boolean;
};

/**
 * «Gear» on a profile (TASK-486 part D, ADR-0393, the user's choice 4): the
 * items in use, then «Retired», as whoever sees the profile sees them: the
 * items «Hide from profile» are not there, not even on one's own. A touch
 * opens the item. Nothing at all without items, from an API of before
 * (404), or with GEAR_ON off.
 */
export function ProfileGear({
  apiUrl,
  token,
  publicId,
  owner,
  onSessionEnded,
  fetchFn,
  apiKey,
  on = GEAR_ON,
}: Props) {
  const asked = `${token} ${publicId}`;
  // The gear of one profile, asked with one token.
  const [answer, setAnswer] = useState<{ asked: string; gear: Gear[] } | null>(null);
  const [opened, setOpened] = useState<Gear | null>(null);

  useEffect(() => {
    if (!on) {
      return;
    }
    let live = true;
    void fetchProfileGear(apiUrl, token, publicId, { fetchFn, key: apiKey }).then(
      (outcome) => {
        if (!live) {
          return;
        }
        if (outcome.kind === "ok" && outcome.value !== null) {
          setAnswer({ asked, gear: outcome.value });
        } else if (sessionEnded(outcome)) {
          onSessionEnded(token);
        }
      },
    );
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, asked, fetchFn, on, onSessionEnded, publicId, token]);

  const gear = on && answer?.asked === asked ? answer.gear : [];
  if (gear.length === 0) {
    return null;
  }
  const inUse = gear.filter((item) => !item.retired);
  const retired = gear.filter((item) => item.retired);
  const api = { baseUrl: apiUrl, key: apiKey };
  const row = (item: Gear) => (
    <GearRow
      key={item.id}
      item={item}
      token={token}
      api={api}
      onPress={() => setOpened(item)}
      testID={`profile-gear-${item.id}`}
    />
  );
  return (
    <View style={styles.section} testID="profile-gear">
      <Text style={styles.heading} accessibilityRole="header">
        {t("Gear")}
      </Text>
      {inUse.map(row)}
      {retired.length > 0 && <Text style={styles.subheading}>{t("Retired")}</Text>}
      {retired.map(row)}
      {opened !== null && (
        <GearSheet
          item={opened}
          owner={owner}
          apiUrl={apiUrl}
          token={token}
          onSessionEnded={onSessionEnded}
          onClose={() => setOpened(null)}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
    </View>
  );
}

// As the group runs of a profile (`groupRuns/ProfileGroupRuns`).
const styles = StyleSheet.create({
  section: {
    gap: space.sm,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  subheading: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    marginTop: space.sm,
  },
});
