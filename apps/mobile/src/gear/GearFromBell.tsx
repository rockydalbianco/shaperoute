import type { Gear } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";

import { sessionEnded } from "../account/messages";
import { fetchMyGear } from "../api/gear";
import { useFollowsDoor } from "../social/followsDoor";
import { type AskedGear, closeGearItem, useAskedGear } from "./gearDoor";
import { GearEditor } from "./GearEditor";
import { GEAR_ON } from "./gearOn";
import type { GearApi } from "./GearSetting";

type Props = {
  /** For the tests: the API, its fake fetch and key, and GEAR_ON. */
  api?: Partial<GearApi>;
  on?: boolean;
};

/**
 * The item of one's gear the bell asked for (TASK-486 part G, ADR-0393,
 * the user's choice 5): «… reached the limit you set.» touched opens the
 * item as «Settings», «Gear» does, to retire it or change its limit. Read
 * again from the list, so it is as it is now; an item deleted since opens
 * nothing. Saved, deleted or closed, it goes.
 */
export function GearFromBellHost({ api = {}, on = GEAR_ON }: Props) {
  const asked = useAskedGear();
  const { apiUrl, account } = useFollowsDoor();
  const baseUrl = api.baseUrl === undefined ? apiUrl : api.baseUrl;
  const { fetchFn, key } = api;
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [found, setFound] = useState<{ asked: AskedGear; item: Gear } | null>(null);

  useEffect(() => {
    if (!on || asked === null || token === null || baseUrl === null) {
      return;
    }
    let live = true;
    void fetchMyGear(baseUrl, token, { fetchFn, key }).then((outcome) => {
      if (!live) {
        return;
      }
      const item =
        outcome.kind === "ok"
          ? outcome.value?.find((one) => one.id === asked.id)
          : undefined;
      if (item !== undefined) {
        setFound({ asked, item });
        return;
      }
      if (sessionEnded(outcome)) {
        onSessionEnded(token);
      }
      closeGearItem();
    });
    return () => {
      live = false;
    };
  }, [asked, baseUrl, fetchFn, key, on, onSessionEnded, token]);

  if (!on || asked === null || token === null || found?.asked !== asked) {
    return null;
  }
  return (
    <GearEditor
      visible
      item={found.item}
      onClose={closeGearItem}
      onSaved={closeGearItem}
      token={token}
      api={{ baseUrl, fetchFn, key }}
      onSessionEnded={() => onSessionEnded(token)}
    />
  );
}
