import type { Gear } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { sessionEnded } from "../account/messages";
import type { Account } from "../account/useAccount";
import { apiUrl } from "../api/apiUrl";
import { fetchMyGear } from "../api/gear";
import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { GEAR_ON } from "./gearOn";
import { GearPage } from "./GearPage";

export type GearApi = {
  baseUrl: string | null;
  fetchFn?: typeof fetch;
  key?: string | null;
};

type Props = {
  account: Pick<Account, "state" | "sessionEnded">;
  /** The API and, in the tests, its fake fetch. */
  api?: GearApi;
  /** GEAR_ON; the tests turn it on. */
  on?: boolean;
};

/**
 * «Gear» in «Settings» (TASK-486 part B, ADR-0393): how many items there
 * are, and a tap opens the list. Only with GEAR_ON and on an API that has
 * the gear: an older one answers 404 and the row is not there.
 */
export function GearSetting({
  account,
  api = { baseUrl: apiUrl() },
  on = GEAR_ON,
}: Props) {
  const { baseUrl, fetchFn, key } = api;
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [items, setItems] = useState<{ token: string; gear: Gear[] } | null>(null);
  const [open, setOpen] = useState(false);

  // One more each time an item is saved or deleted: the list is read again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!on || token === null || baseUrl === null) {
      return;
    }
    let live = true;
    void fetchMyGear(baseUrl, token, { fetchFn, key }).then((outcome) => {
      if (!live) {
        return;
      }
      if (outcome.kind === "ok") {
        setItems(outcome.value === null ? null : { token, gear: outcome.value });
      } else if (sessionEnded(outcome)) {
        onSessionEnded(token);
      }
    });
    return () => {
      live = false;
    };
  }, [baseUrl, fetchFn, key, on, onSessionEnded, token, version]);

  if (!on || token === null || baseUrl === null || items?.token !== token) {
    return null;
  }
  const inUse = items.gear.filter((item) => !item.retired).length;
  return (
    <View style={styles.menu}>
      <Tap
        style={styles.row}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={inUse > 0 ? `${t("Gear")}, ${inUse}` : t("Gear")}
      >
        <Text style={styles.emoji}>👟</Text>
        <Text style={styles.rowText}>{t("Gear")}</Text>
        {inUse > 0 && <Text style={styles.value}>{inUse}</Text>}
      </Tap>
      <GearPage
        visible={open}
        onClose={() => setOpen(false)}
        gear={items.gear}
        onChanged={() => setVersion((was) => was + 1)}
        token={token}
        api={api}
        onSessionEnded={() => onSessionEnded(token)}
      />
    </View>
  );
}

// The rows of «Settings» (`../profile/SettingsPage`), as «Body» has them.
const styles = StyleSheet.create({
  menu: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  row: {
    minHeight: MIN_TAP_SIZE + space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
  },
  emoji: {
    fontSize: fontSize.input + space.xs,
  },
  rowText: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
  },
  value: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
});
