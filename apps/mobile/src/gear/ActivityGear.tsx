import type { Gear } from "@shaperoute/shared-types";
import { useState } from "react";
import {
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";

import { sessionEnded } from "../account/messages";
import { ActivitySheet } from "../activities/ActivitySheet";
import { fetchActivityGear, saveActivityGear } from "../api/gear";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { forgetGearFor } from "./gearOut";
import { GearPicker, toggled, useMyGear } from "./GearPicker";
import type { GearApi } from "./GearSetting";

type Props = {
  /** The activity's key in «My activities». */
  activityKey: string;
  /** The sheet went down: the «…» it was opened from goes with it. */
  onClosed?: () => void;
  /** The look of the «…» rows (menuChoice). */
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** The API and, in the tests, its fake fetch. */
  api?: Partial<GearApi>;
  /** GEAR_ON; the tests turn it on. */
  on?: boolean;
};

type Shown =
  | { kind: "loading" }
  | { kind: "ready"; onIt: Gear[]; chosen: string[] }
  | { kind: "missing" }
  | { kind: "failed" };

/**
 * «Gear» in the «…» of an activity of «My activities» (TASK-486 part C,
 * ADR-0393): a sheet with the items on it and those in use, to add or take
 * off; «Done» puts the list on the API, which counts the totals again.
 * An activity of before is linked this way, by hand. A retired item stays
 * offered on the activities it is on. Only with items, on an API with gear.
 */
export function ActivityGear({
  activityKey,
  onClosed,
  style,
  textStyle,
  api = {},
  on,
}: Props) {
  const mine = useMyGear(api, on);
  const { apiUrl, account } = useFollowsDoor();
  const baseUrl = api.baseUrl === undefined ? apiUrl : api.baseUrl;
  const { fetchFn, key } = api;
  const { state, sessionEnded: onSessionEnded } = account;
  const session = state.status === "signedIn" ? state.session : null;
  const [shown, setShown] = useState<Shown | null>(null);
  const [saving, setSaving] = useState(false);
  if (mine === null || mine.length === 0 || session === null || baseUrl === null) {
    return null;
  }
  const { token } = session;
  const options = { fetchFn, key };

  function close() {
    setShown(null);
    onClosed?.();
  }

  function open() {
    if (baseUrl === null) {
      return;
    }
    setShown({ kind: "loading" });
    void fetchActivityGear(baseUrl, token, activityKey, options).then((outcome) => {
      if (outcome.kind === "ok") {
        setShown({
          kind: "ready",
          onIt: outcome.value,
          chosen: outcome.value.map((item) => item.id),
        });
      } else if (sessionEnded(outcome)) {
        onSessionEnded(token);
        setShown(null);
      } else {
        // Still on the phone, on its way to the API: 404 until it arrives.
        setShown({
          kind:
            outcome.kind === "api_error" && outcome.code === "http_error"
              ? "missing"
              : "failed",
        });
      }
    });
  }

  function done() {
    if (shown?.kind !== "ready" || baseUrl === null || session === null) {
      close();
      return;
    }
    setSaving(true);
    void saveActivityGear(
      baseUrl,
      token,
      activityKey,
      { gear_ids: shown.chosen },
      options,
    ).then((outcome) => {
      setSaving(false);
      if (outcome.kind === "ok") {
        // What the end of the activity left for it would undo this.
        forgetGearFor(session.user.id, activityKey);
        close();
      } else if (sessionEnded(outcome)) {
        onSessionEnded(token);
        close();
      } else {
        setShown({ kind: "failed" });
      }
    });
  }

  // In use, and the retired ones that are on this activity.
  const offered =
    shown?.kind === "ready"
      ? [
          ...mine.filter((item) => !item.retired),
          ...shown.onIt.filter(
            (item) =>
              item.retired &&
              !mine.some((other) => other.id === item.id && !other.retired),
          ),
        ]
      : [];

  return (
    <>
      <Tap
        style={style}
        onPress={open}
        accessibilityRole="button"
        testID="activity-gear"
      >
        <Text style={textStyle}>{t("Gear")}</Text>
      </Tap>
      <ActivitySheet
        visible={shown !== null}
        onClose={close}
        testID="activity-gear-sheet"
      >
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            {t("Gear")}
          </Text>
          <Tap
            style={styles.done}
            onPress={done}
            disabled={saving}
            accessibilityRole="button"
            hitSlop={space.sm}
          >
            <Text style={styles.doneText}>{t("Done")}</Text>
          </Tap>
        </View>
        {shown?.kind === "ready" && (
          <GearPicker
            gear={offered}
            chosen={shown.chosen}
            label={false}
            toggle={(id) => setShown({ ...shown, chosen: toggled(shown.chosen, id) })}
          />
        )}
        {shown?.kind === "missing" && (
          <Text style={styles.note}>
            {t("This activity is still on its way. Try again in a moment.")}
          </Text>
        )}
        {shown?.kind === "failed" && (
          <Text style={styles.problem} accessibilityRole="alert">
            {t("No connection. Try again when you are online.")}
          </Text>
        )}
      </ActivitySheet>
    </>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  title: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  done: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  doneText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
});
