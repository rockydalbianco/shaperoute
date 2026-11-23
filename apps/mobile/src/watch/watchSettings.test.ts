import { NO_BODY } from "../body/bodyProfile";
import { NO_HEART, zonesOf } from "../body/heartZones";
import { decodeWatchMessage, encodeWatchMessage } from "./watchMessages";
import { watchSettings } from "./watchSettings";

// What the watch keeps of the phone's settings (TASK-370 part B5): the
// units, and the zones of «Heart rate zones» when there are some.

const YEAR = 2026;
const AT = 1762358400000;

test("without an age or a max heart rate the watch gets the units only", () => {
  expect(watchSettings("mi", NO_HEART, NO_BODY, YEAR, AT)).toEqual({
    type: "settings",
    units: "mi",
    at: AT,
  });
});

test("with an age the watch gets the zones the phone shows", () => {
  const body = { ...NO_BODY, birthYear: 1986 };
  const message = watchSettings("km", NO_HEART, body, YEAR, AT);
  // Tanaka at 40: 208 − 28 = 180; 50% to 100% of it.
  expect(message.heartZones).toEqual([90, 108, 126, 144, 162, 180]);
});

test("a max typed by hand and the limits moved by hand are the ones sent", () => {
  const heart = { maxBpm: 190, restBpm: null, limits: [null, 120, null, null, null] };
  const message = watchSettings("km", heart, NO_BODY, YEAR, AT);
  const zones = zonesOf(190, heart);
  expect(message.heartZones).toEqual([...zones.map((zone) => zone.fromBpm), 190]);
  expect(message.heartZones?.[1]).toBe(120);
});

test("the message the watch reads back is the same", () => {
  const body = { ...NO_BODY, birthYear: 1986 };
  const message = watchSettings("km", NO_HEART, body, YEAR, AT);
  expect(decodeWatchMessage(encodeWatchMessage(message))).toEqual({
    ok: true,
    message,
  });
});
