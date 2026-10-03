import type { Session } from "@shaperoute/shared-types";
import { useEffect } from "react";
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
import { t, tLater } from "../i18n";
import { EditProfile } from "../profile/EditProfile";
import { ProfileHome } from "../profile/ProfileHome";
import { SettingsPage } from "../profile/SettingsPage";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { SignInScreen } from "./SignInScreen";

type Notice = { text: string; tone: "warning" | "muted" };

/** In English: `noticeOf` says them in the app's language (TASK-210). */
const NOTICES: Record<SignedOutNotice, Notice> = {
  ended: { text: SESSION_ENDED, tone: "warning" },
  deleted: {
    text: tLater("Your account and everything that was yours have been deleted."),
    tone: "muted",
  },
  loggedOut: { text: tLater("You are logged out on this phone."), tone: "muted" },
};

function noticeOf(notice: SignedOutNotice): Notice {
  const { text, tone } = NOTICES[notice];
  return { text: t(text), tone };
}

/** The pages of «Profile»: the account, the routes it keeps (TASK-171), the
 * runs it recorded (TASK-172), its settings (TASK-177) and its username and
 * bio (TASK-116). */
export type ProfilePage = "account" | "favorites" | "activities" | "settings" | "edit";

/** In English: shown with `t()` (TASK-210). */
const TITLES: Record<ProfilePage, string> = {
  account: tLater("Profile"),
  favorites: tLater("Favorites"),
  activities: tLater("My activities"),
  settings: tLater("Settings"),
  edit: tLater("Edit profile"),
};

/** Pages of the account itself: who signs in again does not land there. */
const ACCOUNT_PAGES: ProfilePage[] = ["settings", "edit"];

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
 * favorites (TASK-171), its runs (TASK-172) and «Settings», where it logs
 * out and deletes the account (TASK-177). Over the app, which stays as it
 * was; it opens from the header of the pages (TASK-154).
 */
export function ProfileScreen({ account, page, onPage, hint, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { state } = account;
  // A page of the account is one step into «Profile»: back goes to it first.
  const inside = state.status === "signedIn" && page !== "account";
  const signedOut = state.status !== "signedIn";
  // Out of the account from «Settings» or «Edit profile»: who comes back in
  // finds «Profile».
  useEffect(() => {
    if (signedOut && ACCOUNT_PAGES.includes(page)) {
      onPage("account");
    }
  }, [signedOut, page, onPage]);
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
            accessibilityLabel={t("Back")}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            {t(TITLES[inside ? page : "account"])}
          </Text>
        </View>
        {inside ? (
          page === "activities" ? (
            <ActivitiesList />
          ) : page === "settings" ? (
            <SettingsPage user={state.session.user} account={account} />
          ) : page === "edit" ? (
            <EditProfile
              user={state.session.user}
              account={account}
              onDone={() => onPage("account")}
            />
          ) : (
            <FavoritesList margin={space.lg} />
          )
        ) : state.status === "signedIn" ? (
          <SignedIn session={state.session} onPage={onPage} />
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
                ? noticeOf(state.notice)
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

/** The first page with an account: who it is, and the ways to its pages. */
function SignedIn({
  session,
  onPage,
}: {
  session: Session;
  onPage: (page: ProfilePage) => void;
}) {
  const favorites = useFavoritesDoor();
  const activities = useActivitiesDoor();
  return (
    <ProfileHome
      user={session.user}
      favorites={favorites.status === "ready" ? favorites.list.length : null}
      activities={activities.total}
      onOpen={onPage}
      onEdit={() => onPage("edit")}
    />
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
});
