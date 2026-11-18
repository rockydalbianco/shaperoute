/** The push of a planned live that started opens its live view (TASK-468
 * part B2b1). */
import push from "@shaperoute/shared-types/fixtures/planned-live-push-data.json";

import { tapTarget } from "./notificationTap";
import { type Opens, openTarget } from "./openTarget";

test("«… is live» opens the live view of its share", () => {
  expect(tapTarget(push)).toEqual({
    kind: "live",
    shareId: push.share_id,
    plannedLiveId: push.planned_live_id,
  });
  expect(tapTarget({ ...push, share_id: "" })).toBeNull();
  expect(tapTarget({ kind: push.kind })).toBeNull();
});

test("the live target goes to openLive, and to nothing without it", () => {
  const openLive = jest.fn();
  const opens: Opens = {
    openDrawing: jest.fn(),
    openProfile: jest.fn(),
    openPlay: jest.fn(),
    openChallenge: jest.fn(),
    openLive,
  };
  openTarget({ kind: "live", shareId: "s", plannedLiveId: "p" }, opens);
  expect(openLive).toHaveBeenCalledWith("s", "p");
  const { openLive: _none, ...without } = opens;
  expect(() =>
    openTarget({ kind: "live", shareId: "s", plannedLiveId: "p" }, without),
  ).not.toThrow();
  expect(opens.openPlay).not.toHaveBeenCalled();
});
