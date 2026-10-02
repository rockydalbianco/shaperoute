import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Account } from "../account/useAccount";
import { sessionEnded } from "../account/messages";
import { type Activity, type ActivityDetail, fetchActivity } from "../api/activities";
import { activityProblem, type ActivitiesState, useActivities } from "./useActivities";

/**
 * The runs of the account as the whole app reaches them (TASK-172): the
 * list in «Profile», and the run opened from it, which the map shows.
 */
export type ActivitiesDoor = ActivitiesState & {
  /** The run of the list being fetched whole, by id; null when none. */
  opening: string | null;
  /** Fetches the run whole and shows it on the map. */
  open: (activity: Activity) => void;
  /** The run on the map; null when none. */
  opened: ActivityDetail | null;
  /** The map lets the run go. */
  close: () => void;
  /** From the map back to the list in «Profile». */
  showList: () => void;
};

const NOTHING: ActivitiesDoor = {
  status: "off",
  list: [],
  total: null,
  more: false,
  loadingMore: false,
  problem: null,
  refresh: () => {},
  loadMore: () => {},
  remove: () => {},
  saved: () => {},
  clearProblem: () => {},
  opening: null,
  open: () => {},
  opened: null,
  close: () => {},
  showList: () => {},
};

/** Without «Profile» around it (a test of one screen): no activities. */
export const ActivitiesContext = createContext<ActivitiesDoor>(NOTHING);

export function useActivitiesDoor(): ActivitiesDoor {
  return useContext(ActivitiesContext);
}

type Doors = {
  /** Opens «Profile» on the list of the runs. */
  onList: () => void;
  /** A run is on the map: «Profile» gets out of its way. */
  onOpened: () => void;
};

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** The runs of the account, for «Profile» to hand to the app. */
export function useActivitiesOf(
  baseUrl: string | null,
  account: Account,
  { onList, onOpened }: Doors,
  options: Options = {},
): ActivitiesDoor {
  const { state } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const activities = useActivities(baseUrl, token, account.sessionEnded, options);
  const { fetchFn, key } = options;

  const [opening, setOpening] = useState<string | null>(null);
  const [opened, setOpened] = useState<ActivityDetail | null>(null);
  const [openProblem, setOpenProblem] = useState<string | null>(null);
  // The last run asked for wins.
  const asked = useRef<string | null>(null);
  const { sessionEnded: endSession } = account;
  const open = useCallback(
    (activity: Activity) => {
      if (token === null || baseUrl === null) {
        return;
      }
      asked.current = activity.id;
      setOpening(activity.id);
      setOpenProblem(null);
      void fetchActivity(baseUrl, token, activity.id, { fetchFn, key }).then(
        (outcome) => {
          if (asked.current !== activity.id) {
            return;
          }
          asked.current = null;
          setOpening(null);
          if (outcome.kind === "ok") {
            setOpened(outcome.value);
            onOpened();
            return;
          }
          if (sessionEnded(outcome)) {
            endSession(token);
          }
          setOpenProblem(
            // Deleted from another phone of the account since the list came.
            outcome.kind === "api_error" && outcome.code === "http_error"
              ? "This run is no longer in your activities."
              : activityProblem(outcome),
          );
        },
      );
    },
    [baseUrl, endSession, fetchFn, key, onOpened, token],
  );
  const close = useCallback(() => {
    asked.current = null;
    setOpening(null);
    setOpened(null);
  }, []);

  const { clearProblem: clearListProblem } = activities;
  const clearProblem = useCallback(() => {
    clearListProblem();
    setOpenProblem(null);
  }, [clearListProblem]);

  return useMemo(
    () => ({
      ...activities,
      problem: activities.problem ?? openProblem,
      clearProblem,
      opening,
      open,
      // Nobody signed in, nobody's run on the map.
      opened: token === null ? null : opened,
      close,
      showList: onList,
    }),
    [
      activities,
      openProblem,
      clearProblem,
      opening,
      open,
      token,
      opened,
      close,
      onList,
    ],
  );
}
