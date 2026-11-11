import { useState } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { useOwnPage } from "../screens/ProfileLayer";

/**
 * The way from the end of a workout or of a swim to «Sign up» (TASK-453, the
 * user's «Come la corsa»): their screen is over the whole app, so the page
 * of the profile opened under it and the line seemed to do nothing.
 * `signIn` asks for the page, and the screen steps `aside` while that ask
 * stands: until somebody signs in or the page is left, as the end of a run
 * waits under it (TASK-278 part B). What ended stays on the phone meanwhile,
 * and comes back with «Save» for who signed in. Without «Profile» around it
 * (a test of one screen) nothing steps aside.
 */
export function useSignUpAside(): { aside: boolean; signIn: () => void } {
  const { signedIn, signIn } = useActivitiesDoor();
  const { asked } = useOwnPage();
  // How many asks there were when the line was touched: the next is its own.
  const [before, setBefore] = useState<number | null>(null);
  return {
    aside:
      before !== null && !signedIn && asked.n === before + 1 && asked.hint !== null,
    signIn: () => {
      setBefore(asked.n);
      signIn();
    },
  };
}
