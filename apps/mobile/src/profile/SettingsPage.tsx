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

/** A group of «Settings» under its name; each new setting joins one. */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

/**
 * «Settings» in «Profile» (TASK-177), in sections: for now the account, with
 * the ways out of it. «Delete account» asks first, on the screen (ADR-0120:
 * the API does not).
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
      </Section>
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
