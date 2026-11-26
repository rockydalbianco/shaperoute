/** A group's push, or its line in the bell, opens the group's page, never
 * «Play» (TASK-495 part B). */
import groupPushes from "@shaperoute/shared-types/fixtures/group-push-data.json";

import { tapTarget } from "./notificationTap";
import { type Opens, openTarget } from "./openTarget";

function opens(openGroup?: (id: string) => void): Opens {
  return {
    openDrawing: jest.fn(),
    openProfile: jest.fn(),
    openPlay: jest.fn(),
    openChallenge: jest.fn(),
    ...(openGroup === undefined ? {} : { openGroup }),
  };
}

test("each group push goes to openGroup with its group", () => {
  for (const data of groupPushes) {
    const openGroup = jest.fn();
    const all = opens(openGroup);
    const target = tapTarget(data);
    expect(target).not.toBeNull();
    if (target !== null) openTarget(target, all);
    expect(openGroup).toHaveBeenCalledWith(data.group_id);
    expect(all.openPlay).not.toHaveBeenCalled();
  }
});

test("without openGroup nothing opens, and nothing breaks", () => {
  const none = opens();
  expect(() => openTarget({ kind: "group", id: "g" }, none)).not.toThrow();
  expect(none.openPlay).not.toHaveBeenCalled();
});
