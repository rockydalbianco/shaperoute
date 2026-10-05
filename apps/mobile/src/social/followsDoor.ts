import type { Person } from "@shaperoute/shared-types";
import { createContext, useContext } from "react";

import type { Account } from "../account/useAccount";

/**
 * What «Profile» needs to show who follows the account (TASK-211): the API
 * and the account, which the page over the app knows
 * (`screens/ProfileLayer.tsx`), and the way to a member's profile.
 */
export type FollowsDoor = {
  /** The API the account talks to (ADR-0031); null if unknown. */
  apiUrl: string | null;
  account: Pick<Account, "state" | "sessionEnded">;
  /** Opens a member's profile over the app; back comes to «Profile». */
  openProfile: (person: Person) => void;
};

export const FollowsContext = createContext<FollowsDoor>({
  apiUrl: null,
  account: { state: { status: "signedOut", notice: null }, sessionEnded: () => {} },
  openProfile: () => {},
});

export function useFollowsDoor(): FollowsDoor {
  return useContext(FollowsContext);
}
