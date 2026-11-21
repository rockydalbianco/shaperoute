/**
 * The end of a race says what its map shows (TASK-305 part R6c, the user's
 * words of 2026-11-12): «White: on foot. Yellow: in the air.»; a flight
 * alone as before, «White: where you flew.».
 */
import { render, screen } from "@testing-library/react-native";

import { translate } from "../i18n/translate";
import type { FreeRun } from "../navigation/freeRun";
import type { TrackFix } from "../navigation/trackRecorder";
import { FreeFinishBanner } from "../screens/FreeRunScreen";

jest.mock("../settings/useSport", () => ({ useSport: () => "paragliding" }));
jest.mock("../settings/sport", () => ({
  ...jest.requireActual("../settings/sport"),
  loadSport: () => "paragliding",
}));
let mockRun: FreeRun | null = null;
jest.mock("../navigation/freeRun", () => ({
  ...jest.requireActual("../navigation/freeRun"),
  pendingFreeRun: () => mockRun,
}));
jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(() => Promise.resolve(0.6)),
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

const T0 = 1_794_470_400_000;
const M = 1 / 111_195;

/** Up on foot `footS` s at 1.5 m/s, then `airS` s at 10 m/s sinking. */
function runOf(footS: number, airS: number): FreeRun {
  const fixes: TrackFix[] = [];
  for (let s = 0; s <= footS; s += 1) {
    fixes.push({
      point: [45.73 + 1.5 * s * M, 10.83],
      timeMs: T0 + s * 1000,
      accuracyM: 5,
      altitudeM: 1500 + 0.25 * s,
    });
  }
  for (let s = 1; s <= airS; s += 1) {
    fixes.push({
      point: [45.73 + (1.5 * footS + 10 * s) * M, 10.83],
      timeMs: T0 + (footS + s) * 1000,
      accuracyM: 5,
      altitudeM: 1500 + 0.25 * footS - 1.6 * s,
    });
  }
  return { version: 1, route: [], track: { fixes, distanceM: 0 }, status: "stopped" };
}

test("a race: white on foot, yellow in the air", async () => {
  mockRun = runOf(900, 600);
  await render(<FreeFinishBanner />);
  expect(screen.getByText("Your flight")).toBeOnTheScreen();
  expect(screen.getByText("White: on foot. Yellow: in the air.")).toBeOnTheScreen();
});

test("a flight alone, or none to read: as before", async () => {
  mockRun = runOf(0, 600);
  await render(<FreeFinishBanner />);
  expect(screen.getByText("White: where you flew.")).toBeOnTheScreen();
  mockRun = null;
  await render(<FreeFinishBanner />);
  expect(screen.getByText("White: where you flew.")).toBeOnTheScreen();
});

test("the words, in each language", () => {
  const words = "White: on foot. Yellow: in the air.";
  expect((["it", "de", "fr", "es"] as const).map((l) => translate(l, words))).toEqual([
    "Bianco: a piedi. Giallo: in volo.",
    "Weiß: zu Fuß. Gelb: in der Luft.",
    "Blanc : à pied. Jaune : en vol.",
    "Blanco: a pie. Amarillo: en el aire.",
  ]);
});
