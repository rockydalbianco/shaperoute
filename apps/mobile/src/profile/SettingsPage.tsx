import type { User } from "@shaperoute/shared-types";
import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Account } from "../account/useAccount";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

type Props = {
  user: User;
  account: Account;
};

/** A setting with its name on the page and nothing behind it yet. */
type Coming = { emoji: string; name: string };

/**
 * What «Settings» will hold, as the user listed it (ADR-0145): each row is
 * turned on by its own task and leaves this list then.
 */
const ACCOUNT_COMING: Coming[] = [
  { emoji: "📷", name: "Profile picture" },
  { emoji: "✉️", name: "Change email" },
  { emoji: "📱", name: "Phone number" },
];
const COMING: { label: string; rows: Coming[] }[] = [
  { label: "PREFERENCES", rows: [{ emoji: "📏", name: "Units" }] },
  {
    label: "NOTIFICATIONS",
    rows: [
      { emoji: "📧", name: "Email notifications" },
      { emoji: "🔔", name: "Push notifications" },
    ],
  },
  {
    label: "ABOUT",
    rows: [
      { emoji: "❓", name: "Help" },
      { emoji: "📄", name: "Terms" },
      { emoji: "🔒", name: "Privacy" },
    ],
  },
];

/** A group of «Settings» under its name; each new setting joins one. */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

/** Rows that say «Soon» and take no tap: nothing is promised to work. */
function ComingRows({ rows }: { rows: Coming[] }) {
  return (
    <View style={styles.menu}>
      {rows.map((row, at) => (
        <View key={row.name}>
          {at > 0 && <View style={styles.divider} />}
          <View
            style={styles.row}
            accessible
            // One name for the row: the emoji is not read on its own.
            accessibilityLabel={`${row.name}, coming soon`}
          >
            <Text style={styles.emoji}>{row.emoji}</Text>
            <Text style={styles.rowText}>{row.name}</Text>
            <Text style={styles.soon}>Soon</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * «Settings» in «Profile» (TASK-177), in sections: the account with the
 * ways out of it, and the settings to come, named and marked «Soon».
 * «Delete account» asks first, on the screen (ADR-0120: the API does not).
 */
export function SettingsPage({ user, account }: Props) {
  const [confirming, setConfirming] = useState(false);
  const deleting = account.busy === "delete";
  return (
    <View style={styles.page}>
      <Section label="ACCOUNT">
        <View style={styles.card}>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
        <ComingRows rows={ACCOUNT_COMING} />
      </Section>
      {COMING.map((section) => (
        <Section key={section.label} label={section.label}>
          <ComingRows rows={section.rows} />
        </Section>
      ))}
      {/* The ways out of the account, last. */}
      <View style={styles.section}>
        <Pressable
          style={styles.button}
          onPress={account.signOut}
          disabled={deleting}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Log out</Text>
        </Pressable>
        {confirming ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmText}>
              Delete your account? Everything that is yours goes with it, at once. It
              cannot be undone.
            </Text>
            <Pressable
              style={[styles.button, styles.danger, deleting && styles.busy]}
              onPress={account.deleteAccount}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityState={{ disabled: deleting, busy: deleting }}
            >
              <Text style={[styles.buttonText, styles.dangerText]}>
                {deleting ? "Deleting…" : "Delete my account"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={() => {
                setConfirming(false);
                account.clearProblem();
              }}
              disabled={deleting}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Keep my account</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.quiet}
            onPress={() => setConfirming(true)}
            accessibilityRole="button"
          >
            <Text style={styles.dangerText}>Delete account</Text>
          </Pressable>
        )}
        {account.problem && <Text style={styles.problem}>{account.problem}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: space.xl,
  },
  section: {
    gap: space.lg,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: space.md,
    backgroundColor: color.border,
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
  soon: {
    color: color.textFaint,
    fontSize: fontSize.small,
  },
  card: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  username: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  email: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  // Neutral: the yellow belongs to the route (docs/UI.md, «Il tema»).
  button: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  quiet: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  confirm: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.error,
    backgroundColor: color.surface,
  },
  confirmText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  danger: {
    borderColor: color.error,
  },
  dangerText: {
    color: color.error,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  busy: {
    opacity: 0.6,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
});
