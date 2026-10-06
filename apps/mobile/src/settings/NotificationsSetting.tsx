import type { Notifications, User } from "@shaperoute/shared-types";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Account } from "../account/useAccount";
import { t, tLater } from "../i18n";
import { color, fontSize, radius, space } from "../theme/tokens";
import { contactStyles } from "./ContactField";
import { notificationsOf } from "./notificationFields";

type Props = {
  user: User;
  account: Pick<Account, "changeNotifications">;
};

type Which = keyof Notifications;

/** The two switches, in the order of the page; the names shown with `t()`. */
const SWITCHES: { which: Which; emoji: string; name: string }[] = [
  { which: "email", emoji: "📧", name: tLater("Email notifications") },
  { which: "push", emoji: "🔔", name: tLater("Push notifications") },
];

/**
 * «NOTIFICATIONS» in «Settings» (TASK-185, ADR-0206): «Email notifications»
 * and «Push notifications», each a switch kept in the account, both off
 * until turned on. MuW sends nothing yet, and the note under the rows
 * says so: turning «Push notifications» on only keeps the choice, the phone
 * is asked for no permission. A switch shows its new value at once and goes
 * back if the API refuses, with the reason under the rows; while one answer
 * is on its way, a second tap sends nothing.
 */
export function NotificationsSetting({ user, account }: Props) {
  const kept = notificationsOf(user);
  // The switch tapped, as it will be once the API has kept it.
  const [sending, setSending] = useState<{ which: Which; on: boolean } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const busyNow = useRef(false);
  const shown: Notifications =
    sending === null ? kept : { ...kept, [sending.which]: sending.on };

  async function turn(which: Which, on: boolean) {
    if (busyNow.current) {
      return;
    }
    busyNow.current = true;
    setSending({ which, on });
    setProblem(null);
    // Only the switch that changes: the other stays as the API has it.
    const failed = await account.changeNotifications(
      which === "email" ? { email: on } : { push: on },
    );
    busyNow.current = false;
    // Kept, the account has it by now; refused, the switch goes back.
    setSending(null);
    setProblem(failed);
  }

  return (
    <View style={styles.setting}>
      <View style={contactStyles.menu}>
        {SWITCHES.map(({ which, emoji, name }, at) => (
          <View key={which}>
            {at > 0 && <View style={contactStyles.divider} />}
            <Pressable
              style={({ pressed }) => [
                contactStyles.row,
                pressed && contactStyles.pressed,
              ]}
              onPress={() => void turn(which, !shown[which])}
              accessibilityRole="switch"
              // One name for the row: the emoji is not read on its own.
              accessibilityLabel={t(name)}
              accessibilityState={{
                checked: shown[which],
                busy: sending?.which === which,
              }}
            >
              <Text style={contactStyles.emoji}>{emoji}</Text>
              <Text style={contactStyles.rowText}>{t(name)}</Text>
              <View style={[styles.track, shown[which] && styles.trackOn]}>
                <View style={[styles.knob, shown[which] && styles.knobOn]} />
              </View>
            </Pressable>
          </View>
        ))}
      </View>
      <Text style={styles.note}>
        {t(
          "MuW does not send notifications yet. Your choice is kept for when it does.",
        )}
      </Text>
      {problem !== null && <Text style={styles.problem}>{problem}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  // As «Offline maps» (`../engine/OfflineMapsSetting`): the rows, and a
  // small note under them.
  setting: {
    gap: space.sm,
  },
  // A switch as phones draw one, as the run's are (`RunDashboard`): the
  // knob on the right when it is on. Neutral: the yellow belongs to the
  // route (docs/UI.md, «Il tema»).
  track: {
    width: 40,
    height: 24,
    justifyContent: "center",
    paddingHorizontal: 3,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  trackOn: {
    backgroundColor: color.text,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: color.textMuted,
  },
  knobOn: {
    alignSelf: "flex-end",
    backgroundColor: color.background,
  },
  note: {
    paddingHorizontal: space.md,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  problem: {
    paddingHorizontal: space.md,
    color: color.error,
    fontSize: fontSize.body,
  },
});
