import type { Person } from "@shaperoute/shared-types";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useAccount } from "../account/useAccount";
import { ActivitiesContext, useActivitiesOf } from "../activities/activitiesDoor";
import { FavoritesContext, useFavoritesOf } from "../favorites/favoritesDoor";
import { t, tPlural } from "../i18n";
import { ProfilePhotoContext, useProfilePhotoOf } from "../profile/useProfilePhoto";
import { CommentsContext, useCommentsOf } from "../social/commentsDoor";
import { DrawingsContext, useDrawingsOf } from "../social/drawingsDoor";
import { useFollowRequestsOf } from "../social/followRequests";
import { FollowsContext } from "../social/followsDoor";
import { PeopleContext } from "../social/peopleDoor";
import { LOG_IN_TO_FIND } from "../social/PeopleSearch";
import { ReactionsContext, useReactionsOf } from "../social/reactionsDoor";
import { RequestsBadge } from "../social/RequestsBadge";
import { StravaContext, useStravaOf } from "../strava/useStrava";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { PeopleScreen } from "./PeopleScreen";
import { type ProfilePage, ProfileScreen } from "./ProfileScreen";

/** «Find friends» (TASK-215): on screen, or behind a drawing opened from it. */
type PeopleAt = "shown" | "behind" | null;

/** What the button in the header needs to know of the account. */
type Door = {
  open: () => void;
  /** The session ended: «Profile» asks to log in again. */
  attention: boolean;
  /** The first letter of who is signed in; null when nobody is. */
  initial: string | null;
  /** Their picture (TASK-178), in place of the letter; null without one. */
  photo: string | null;
  /** How many ask to follow them and wait for an answer (TASK-239). */
  requests: number;
};

const DoorContext = createContext<Door>({
  open: () => {},
  attention: false,
  initial: null,
  photo: null,
  requests: 0,
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
  // «Find friends», opened from «Feed» (TASK-215); a ref too, for the doors
  // of the drawings, made once.
  const [people, setPeopleState] = useState<PeopleAt>(null);
  const peopleAt = useRef<PeopleAt>(null);
  const setPeople = useCallback((next: PeopleAt) => {
    peopleAt.current = next;
    setPeopleState(next);
  }, []);
  // A member touched in the lists of «Profile» (TASK-211): «Find friends»
  // opens on their profile, and back comes to «Profile».
  const [member, setMember] = useState<Person | null>(null);
  // Where the drawing on the map was opened: back goes there. From «Feed»
  // (TASK-118), with «Profile» closed, back is the page under the map.
  const drawingFrom = useRef<"profile" | "people" | "feed">("profile");
  // The page as the doors of the drawings, made once, see it.
  const pageAt = useRef<ProfilePage | null>(null);
  useEffect(() => {
    pageAt.current = page;
  }, [page]);
  const shown = page !== null || people === "shown";
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
  // the map, and comes back to it; one opened from a member found by
  // «Find friends» comes back there (TASK-215); one opened from «Feed»,
  // with «Profile» closed, comes back to «Feed» (TASK-118).
  const drawingDoors = useMemo(
    () => ({
      onOpened: () => {
        if (peopleAt.current === "shown") {
          drawingFrom.current = "people";
          setPeople("behind");
        } else {
          drawingFrom.current = pageAt.current === null ? "feed" : "profile";
          setPeople(null);
        }
        setPage(null);
      },
      onBack: () => {
        setHint(null);
        if (drawingFrom.current === "people" && peopleAt.current !== null) {
          setPeople("shown");
        } else if (drawingFrom.current === "profile") {
          setPage("account");
        }
      },
    }),
    [setPeople],
  );
  const drawings = useDrawingsOf(apiUrl, account, drawingDoors);
  // What the members write under a drawing (TASK-120): the drawing's card
  // is in the app, on the map.
  const comments = useCommentsOf(apiUrl, account);
  // And the reactions they leave there (TASK-119).
  const reactions = useReactionsOf(apiUrl, account);
  // Who asks to follow the account (TASK-239): the number on the button
  // in the header, asked while the app is open.
  const { count: requests, counted: onRequests } = useFollowRequestsOf(apiUrl, account);
  const photoUri = photo.uri;
  const attention = state.status === "signedOut" && state.notice === "ended";
  const initial =
    state.status === "signedIn"
      ? state.session.user.username.charAt(0).toUpperCase()
      : null;
  // «Find friends» asks the API with the account: without one, «Profile»
  // first, saying why.
  const signedIn = state.status === "signedIn";
  const peopleDoor = useMemo(
    () => ({
      open: () => {
        if (signedIn) {
          setMember(null);
          setPeople("shown");
          return;
        }
        setHint(t(LOG_IN_TO_FIND));
        setPage("account");
      },
    }),
    [setPeople, signedIn],
  );
  // Who follows the account (TASK-211): «Profile» shows the lists, and a
  // name in them opens the member's profile over it.
  const followsDoor = useMemo(
    () => ({
      apiUrl,
      account,
      openProfile: (person: Person) => {
        setMember(person);
        setPage(null);
        setPeople("shown");
      },
      requests,
      onRequests,
    }),
    [account, apiUrl, onRequests, requests, setPeople],
  );
  const door = useMemo(
    () => ({
      open: () => {
        setHint(null);
        setPage("account");
      },
      attention,
      initial,
      photo: photoUri,
      requests,
    }),
    [attention, initial, photoUri, requests],
  );
  return (
    <DoorContext.Provider value={door}>
      <FavoritesContext.Provider value={favorites}>
        <ActivitiesContext.Provider value={activities}>
          <ProfilePhotoContext.Provider value={photo}>
            <StravaContext.Provider value={strava}>
              <DrawingsContext.Provider value={drawings}>
                <PeopleContext.Provider value={peopleDoor}>
                  <View style={styles.layer}>
                    <View
                      style={styles.app}
                      // Under «Profile» the app is out of the screen reader's sight too.
                      accessibilityElementsHidden={shown}
                      importantForAccessibility={shown ? "no-hide-descendants" : "auto"}
                    >
                      <CommentsContext.Provider value={comments}>
                        <ReactionsContext.Provider value={reactions}>
                          {/* The end of a run tags members, and a tagged
                              name opens a profile (TASK-208). */}
                          <FollowsContext.Provider value={followsDoor}>
                            {children}
                          </FollowsContext.Provider>
                        </ReactionsContext.Provider>
                      </CommentsContext.Provider>
                    </View>
                    {people !== null && (
                      <PeopleScreen
                        // A member of the lists, or the search: not the same page.
                        key={member?.public_id ?? "search"}
                        apiUrl={apiUrl}
                        account={account}
                        first={member}
                        hidden={people === "behind"}
                        onBack={() => {
                          setPeople(null);
                          if (member !== null) {
                            setMember(null);
                            setHint(null);
                            setPage("account");
                          }
                        }}
                      />
                    )}
                    {page !== null && (
                      <FollowsContext.Provider value={followsDoor}>
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
                      </FollowsContext.Provider>
                    )}
                  </View>
                </PeopleContext.Provider>
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
 * nobody is. At its top right, in red, how many ask to follow them
 * (TASK-239).
 */
export function ProfileButton() {
  const { open, attention, initial, photo, requests } = useContext(DoorContext);
  return (
    <Pressable
      style={styles.button}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={
        requests > 0
          ? tPlural(
              requests,
              "Profile, {count} follow request",
              "Profile, {count} follow requests",
            )
          : t(attention ? "Profile, log in again" : "Profile")
      }
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
      <RequestsBadge count={requests} />
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
