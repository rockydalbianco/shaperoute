import { createContext, useContext } from "react";

/**
 * The way to the search for members (TASK-215), as the pages of the app
 * reach it: «Feed» has the button, «Profile» the page over the app
 * (`screens/ProfileLayer.tsx`), which knows the account.
 */
export type PeopleDoor = {
  /** Opens the search; with nobody signed in, «Profile» to log in first. */
  open: () => void;
};

export const PeopleContext = createContext<PeopleDoor>({ open: () => {} });

export function usePeopleDoor(): PeopleDoor {
  return useContext(PeopleContext);
}
