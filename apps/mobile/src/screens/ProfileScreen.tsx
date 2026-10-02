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
import { ActivitiesList } from "../activities/ActivitiesList";
import { useActivitiesDoor } from "../activities/activitiesDoor";
import { FavoritesList } from "../favorites/FavoritesList";
import { useFavoritesDoor } from "../favorites/favoritesDoor";
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

/** The pages of «Profile»: the account, the routes it keeps (TASK-171) and
 * the runs it recorded (TASK-172). */
export type ProfilePage = "account" | "favorites" | "activities";

const TITLES: Record<ProfilePage, string> = {
  account: "Profile",
  favorites: "Favorites",
  activities: "My activities",
};

type Props = {
  account: Account;
  /** The page on screen; without an account, always sign up or log in. */
  page: ProfilePage;
  onPage: (page: ProfilePage) => void;
  /** Why «Profile» opened on its own, said over «Sign up»; null when it
   * was opened by hand. */
  hint: string | null;
  /** Back to the app underneath, as it was left. */
  onBack: () => void;
};

/**
 * «Profile» (TASK-115): sign up or log in; with an account, who it is, its
 * favorites (TASK-171), its runs (TASK-172), log out, and delete the
 * account. Over the app, which stays as it was; it opens from the header of
 * the pages (TASK-154).
 */
export function ProfileScreen({ account, page, onPage, hint, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { state } = account;
  // A page of the account is one step into «Profile»: back goes to it first.
  const inside = state.status === "signedIn" && page !== "account";
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
        <View style={styles.titleRow}>
          <Pressable
            style={styles.back}
            onPress={inside ? () => onPage("account") : onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            {TITLES[inside ? page : "account"]}
          </Text>
        </View>
        {inside ? (
          page === "activities" ? (
            <ActivitiesList />
          ) : (
            <FavoritesList margin={space.lg} />
          )
        ) : state.status === "signedIn" ? (
          <SignedIn session={state.session} account={account} onPage={onPage} />
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
            notice={
              state.notice !== null
                ? NOTICES[state.notice]
                : hint !== null
                  ? { text: hint, tone: "muted" }
                  : null
            }
            onSignUp={account.signUp}
            onLogIn={account.signIn}
            onMode={account.clearProblem}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SignedIn({
  session,
  account,
  onPage,
}: {
  session: Session;
  account: Account;
  onPage: (page: ProfilePage) => void;
}) {
  // «Delete account» asks first, on the screen (ADR-0120: the API does not).
  const [confirming, setConfirming] = useState(false);
  const deleting = account.busy === "delete";
  const favorites = useFavoritesDoor();
  const activities = useActivitiesDoor();
  return (
    <View style={styles.signedIn}>
      <View style={styles.card}>
        <Text style={styles.label}>LOGGED IN AS</Text>
        <Text style={styles.username}>{session.user.username}</Text>
        <Text style={styles.email}>{session.user.email}</Text>
      </View>
      {/* What the account keeps: each row opens its page. */}
      <View style={styles.menu}>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={() => onPage("favorites")}
          accessibilityRole="button"
          accessibilityLabel={`Favorites, ${favorites.list.length}`}
        >
          <Text style={styles.rowText}>Favorites</Text>
          <Text style={styles.rowCount}>
            {favorites.status === "ready" ? String(favorites.list.length) : ""}
          </Text>
          <Text style={styles.rowArrow}>›</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={() => onPage("activities")}
          accessibilityRole="button"
          accessibilityLabel={`My activities, ${activities.total ?? 0}`}
        >
          <Text style={styles.rowText}>My activities</Text>
          <Text style={styles.rowCount}>
            {activities.total !== null ? String(activities.total) : ""}
          </Text>
          <Text style={styles.rowArrow}>›</Text>
        </Pressable>
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  back: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  backText: {
    color: color.text,
    fontSize: fontSize.title,
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
  menu: {
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  row: {
    minHeight: MIN_TAP_SIZE + space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  pressed: {
    opacity: 0.6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: space.md,
    backgroundColor: color.border,
  },
  rowText: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  rowCount: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  rowArrow: {
    color: color.textMuted,
    fontSize: fontSize.title,
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
