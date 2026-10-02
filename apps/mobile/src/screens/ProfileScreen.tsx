import type { Session } from "@shaperoute/shared-types";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SESSION_ENDED } from "../account/messages";
import type { Account, SignedOutNotice } from "../account/useAccount";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { SignInScreen } from "./SignInScreen";

const NOTICES: Record<SignedOutNotice, { text: string; tone: "warning" | "muted" }> = {
  ended: { text: SESSION_ENDED, tone: "warning" },
  deleted: {
    text: "Your account and everything that was yours have been deleted.",
    tone: "muted",
  },
  loggedOut: { text: "You are logged out on this phone.", tone: "muted" },
};

/**
 * The «Profile» tab (TASK-115): for now, sign up or log in, log out, and
 * delete the account. Over the «Draw» tab, which stays as it was.
 */
export function ProfileScreen({ account }: { account: Account }) {
  const insets = useSafeAreaInsets();
  const { state } = account;
  return (
    <KeyboardAvoidingView
      style={[StyleSheet.absoluteFill, styles.screen]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.lg,
            paddingBottom: insets.bottom + space.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Profile</Text>
        {state.status === "signedIn" ? (
          <SignedIn session={state.session} account={account} />
        ) : (
          <SignInScreen
            // A new form after each way out: no password left in it.
            key={state.notice ?? "none"}
            // Who had an account logs in; a new phone or a deleted account
            // signs up.
            initialMode={
              state.notice === "ended" || state.notice === "loggedOut"
                ? "logIn"
                : "signUp"
            }
            busy={account.busy === "signUp" || account.busy === "signIn"}
            problem={account.problem}
            notice={state.notice === null ? null : NOTICES[state.notice]}
            onSignUp={account.signUp}
            onLogIn={account.signIn}
            onMode={account.clearProblem}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SignedIn({ session, account }: { session: Session; account: Account }) {
  // «Delete account» asks first, on the screen (ADR-0120: the API does not).
  const [confirming, setConfirming] = useState(false);
  const deleting = account.busy === "delete";
  return (
    <View style={styles.signedIn}>
      <View style={styles.card}>
        <Text style={styles.label}>LOGGED IN AS</Text>
        <Text style={styles.username}>{session.user.username}</Text>
        <Text style={styles.email}>{session.user.email}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
  },
  content: {
    paddingHorizontal: space.lg,
    gap: space.xl,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  signedIn: {
    gap: space.lg,
  },
  card: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
  username: {
    color: color.text,
    fontSize: fontSize.title,
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
