import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useAccount } from "../account/useAccount";
import { ActivitiesContext, useActivitiesOf } from "../activities/activitiesDoor";
import { FavoritesContext, useFavoritesOf } from "../favorites/favoritesDoor";
import { t } from "../i18n";
import { ProfilePhotoContext, useProfilePhotoOf } from "../profile/useProfilePhoto";
import { CommentsContext, useCommentsOf } from "../social/commentsDoor";
import { DrawingsContext, useDrawingsOf } from "../social/drawingsDoor";
import { StravaContext, useStravaOf } from "../strava/useStrava";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { type ProfilePage, ProfileScreen } from "./ProfileScreen";

/** What the button in the header needs to know of the account. */
type Door = {
  open: () => void;
  /** The session ended: «Profile» asks to log in again. */
  attention: boolean;
  /** The first letter of who is signed in; null when nobody is. */
  initial: string | null;
  /** Their picture (TASK-178), in place of the letter; null without one. */
  photo: string | null;
};

const DoorContext = createContext<Door>({
  open: () => {},
  attention: false,
  initial: null,
  photo: null,
});

type Props = {
  /** The API the account talks to (ADR-0031); null if unknown. */
  apiUrl: string | null;
  /** The app: its pages, the map, the run. */
  children: ReactNode;
};

/**
 * The account, and «Profile» over the app (TASK-115; TASK-154, ADR-0124):
 * it opens from the button in the header of the pages and closes with its
 * way back. The app stays mounted underneath, with its map loaded and its
 * choices as they were left.
 */
export function ProfileLayer({ apiUrl, children }: Props) {
  // The page of «Profile» on screen; null while the app is.
  const [page, setPage] = useState<ProfilePage | null>(null);
  // Why «Profile» opened on its own, in a line over «Sign up» (the heart).
  const [hint, setHint] = useState<string | null>(null);
  const shown = page !== null;
  const account = useAccount(apiUrl);
  const { state } = account;
  // The favorites of the account (TASK-171): the heart on the map opens
  // «Profile» when nobody is signed in; a favorite opened leaves it.
  const doors = useMemo(
    () => ({
      onProfile: (to: ProfilePage, why: string | null) => {
        setHint(why);
        setPage(to);
      },
      onOpened: () => setPage(null),
    }),
    [],
  );
  const favorites = useFavoritesOf(apiUrl, account, doors);
  const { forgetWaiting } = favorites;
  // The runs of the account (TASK-172): one opened from its list leaves
  // «Profile» for the map, and comes back to the list.
  const activityDoors = useMemo(
    () => ({
      onList: () => {
        setHint(null);
        setPage("activities");
      },
      onAccount: (why: string) => {
        setHint(why);
        setPage("account");
      },
      onOpened: () => setPage(null),
    }),
    [],
  );
  const activities = useActivitiesOf(apiUrl, account, activityDoors);
  // The picture of the account (TASK-178): changed in «Settings», shown
  // here and in «Profile».
  const photo = useProfilePhotoOf(apiUrl, account);
  // Strava of the account (TASK-187): the end of a run, a run of «My
  // activities» and «Settings» show it.
  const strava = useStravaOf(apiUrl, account);
  // The drawings (TASK-117): one opened from a profile leaves «Profile» for
  // the map, and comes back to it.
  const drawingDoors = useMemo(
    () => ({
      onOpened: () => setPage(null),
      onBack: () => {
        setHint(null);
        setPage("account");
      },
    }),
    [],
  );
  const drawings = useDrawingsOf(apiUrl, account, drawingDoors);
  // What the members write under a drawing (TASK-120): the drawing's card
  // is in the app, on the map.
  const comments = useCommentsOf(apiUrl, account);
  const photoUri = photo.uri;
  const attention = state.status === "signedOut" && state.notice === "ended";
  const initial =
    state.status === "signedIn"
      ? state.session.user.username.charAt(0).toUpperCase()
      : null;
  const door = useMemo(
    () => ({
      open: () => {
        setHint(null);
        setPage("account");
      },
      attention,
      initial,
      photo: photoUri,
    }),
    [attention, initial, photoUri],
  );
  return (
    <DoorContext.Provider value={door}>
      <FavoritesContext.Provider value={favorites}>
        <ActivitiesContext.Provider value={activities}>
          <ProfilePhotoContext.Provider value={photo}>
            <StravaContext.Provider value={strava}>
              <DrawingsContext.Provider value={drawings}>
                <View style={styles.layer}>
                  <View
                    style={styles.app}
                    // Under «Profile» the app is out of the screen reader's sight too.
                    accessibilityElementsHidden={shown}
                    importantForAccessibility={shown ? "no-hide-descendants" : "auto"}
                  >
                    <CommentsContext.Provider value={comments}>
                      {children}
                    </CommentsContext.Provider>
                  </View>
                  {page !== null && (
                    <ProfileScreen
                      account={account}
                      page={page}
                      onPage={setPage}
                      hint={hint}
                      onBack={() => {
                        // Closed without an account: the heart's route waits no more.
                        forgetWaiting();
                        setPage(null);
                      }}
                    />
                  )}
                </View>
              </DrawingsContext.Provider>
            </StravaContext.Provider>
          </ProfilePhotoContext.Provider>
        </ActivitiesContext.Provider>
      </FavoritesContext.Provider>
    </DoorContext.Provider>
  );
}

/**
 * The way to «Profile», at the right of the pages' names: the picture of
 * who is signed in (TASK-178), or their first letter, or a figure when
 * nobody is.
 */
export function ProfileButton() {
  const { open, attention, initial, photo } = useContext(DoorContext);
  return (
    <Pressable
      style={styles.button}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={t(attention ? "Profile, log in again" : "Profile")}
    >
      {initial !== null && photo !== null ? (
        <Image
          source={{ uri: photo }}
          style={styles.photo}
          testID="profile-button-photo"
          accessibilityIgnoresInvertColors
        />
      ) : initial !== null ? (
        <Text style={styles.initial}>{initial}</Text>
      ) : (
        <View style={styles.figure}>
          <View style={styles.head} />
          <View style={styles.shoulders} />
        </View>
      )}
      {attention && <View style={styles.dot} testID="profile-attention" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  layer: {
    flex: 1,
    backgroundColor: color.background,
  },
  app: {
    flex: 1,
  },
  // Neutral, as every control that is not the route's (docs/UI.md, «Il tema»).
  button: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  // Inside the border of the button.
  photo: {
    width: MIN_TAP_SIZE - 2,
    height: MIN_TAP_SIZE - 2,
    borderRadius: radius.pill,
  },
  initial: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  // A head and shoulders, drawn: the app has no icons (no react-native-svg).
  figure: {
    alignItems: "center",
    gap: space.xs / 2,
  },
  head: {
    width: space.sm,
    height: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.text,
  },
  shoulders: {
    width: space.lg,
    height: space.sm,
    borderTopLeftRadius: space.sm,
    borderTopRightRadius: space.sm,
    backgroundColor: color.text,
  },
  dot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: space.sm + space.xs / 2,
    height: space.sm + space.xs / 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.background,
    backgroundColor: color.warning,
  },
});
