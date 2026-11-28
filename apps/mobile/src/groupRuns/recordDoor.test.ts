/**
 * «Start» of a group outing without a route (TASK-495 part C2): the sport
 * chosen, the request taken once by `App`; never the gym nor the
 * stretching, never over a run going on.
 */
import { renderHook } from "@testing-library/react-native";

import { runControl } from "../navigation/runControl";
import { saveSport } from "../settings/sport";
import { askedRecord, askRecord, sportOfActivity, useRecordAsked } from "./recordDoor";

jest.mock("../settings/sport", () => ({
  ...jest.requireActual("../settings/sport"),
  saveSport: jest.fn(),
}));
jest.mock("../navigation/runControl", () => ({
  runControl: jest.fn(() => ({ phase: "idle" })),
}));

const phase = runControl as jest.Mock;

beforeEach(() => {
  (saveSport as jest.Mock).mockClear();
  phase.mockReturnValue({ phase: "idle" });
});

test("an outing's activity is recorded as its sport", () => {
  expect(sportOfActivity("alpinism")).toBe("alpinism");
  expect(sportOfActivity("hiking")).toBe("hike");
  expect(sportOfActivity("ski_touring")).toBe("skimo");
  expect(sportOfActivity("gym")).toBeNull();
  expect(sportOfActivity("stretching")).toBeNull();
  expect(sportOfActivity("curling")).toBeNull();
});

test("the sport is chosen and the app takes the request once", async () => {
  const onAsked = jest.fn();
  await renderHook(() => useRecordAsked(onAsked));
  expect(askRecord("hiking")).toBe(true);
  expect(saveSport).toHaveBeenCalledWith("hike");
  expect(onAsked).toHaveBeenCalledTimes(1);
  expect(onAsked).toHaveBeenCalledWith("hike");
  expect(askedRecord()).toBeNull();
});

test("asked before the app listens, it is taken when it does", async () => {
  expect(askRecord("alpinism")).toBe(true);
  const onAsked = jest.fn();
  await renderHook(() => useRecordAsked(onAsked));
  expect(onAsked).toHaveBeenCalledWith("alpinism");
});

test("a run going on is not cut short; an unknown sport asks nothing", () => {
  phase.mockReturnValue({ phase: "running" });
  expect(askRecord("hiking")).toBe(false);
  phase.mockReturnValue({ phase: "idle" });
  expect(askRecord("gym")).toBe(false);
  expect(saveSport).not.toHaveBeenCalled();
  expect(askedRecord()).toBeNull();
});
