/**
 * A day on snowshoes (TASK-413 part C, the user's «Dentro le ciaspole» and
 * «Sì, vanno bene», 2026-11-12): «Record your day» ❄️ in «Draw» beside the
 * shapes, and at its end «Your day» with cross-country's numbers and
 * «White: where you walked.» over the map.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import { translate } from "../i18n/translate";
import type { FreeRun } from "../navigation/freeRun";
import { addFix, emptyTrack, type Track } from "../navigation/trackRecorder";
import { FreeFinishBanner, FreeFinishCard } from "../screens/FreeRunScreen";
import { withoutRouteIcon } from "../screens/RunNoRouteButton";
import { isRecordOnly, type Sport, withoutRouteLabel } from "../settings/sport";

let mockSport: Sport = "snowshoe";
jest.mock("../settings/useSport", () => ({ useSport: () => mockSport }));

jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(() => Promise.resolve(0.6)),
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

const START: LatLon = [46.4, 11.8];
const METRE = 1 / 111_195;

/** A walk up on the snow: 1.2 km north in 30 minutes, 200 m climbed. */
function walkUp(): Track {
  let track = emptyTrack();
  for (let s = 0; s <= 1800; s += 10) {
    track = addFix(track, {
      point: [START[0] + ((1200 * s) / 1800) * METRE, START[1]],
      timeMs: s * 1000,
      accuracyM: 5,
      altitudeM: 1800 + (200 * s) / 1800,
    });
  }
  return track;
}

function dayOf(track: Track): FreeRun {
  return { version: 1, route: [], track, status: "stopped" };
}

afterEach(() => {
  mockSport = "snowshoe";
});

test("«Draw» offers «Record your day» ❄️ beside the shapes", () => {
  expect(withoutRouteLabel("snowshoe")).toBe("Record your day");
  expect(withoutRouteIcon("snowshoe")).toBe("❄️");
  // The shapes stay: not a sport recorded only.
  expect(isRecordOnly("snowshoe")).toBe(false);
});

test("the end of the day has cross-country's numbers, no descents", async () => {
  await render(<FreeFinishCard run={dayOf(walkUp())} onDone={jest.fn()} />);
  expect(screen.getByLabelText("Distance: 1.20 km")).toBeOnTheScreen();
  expect(screen.getByText("Avg pace")).toBeOnTheScreen();
  expect(screen.getByLabelText("Elev. gain: 200 m")).toBeOnTheScreen();
  expect(screen.getByLabelText("Time: 30:00")).toBeOnTheScreen();
  expect(screen.queryByText("Descents")).toBeNull();
  expect(screen.queryByText("Lifts")).toBeNull();
  // The snow and gear of a resort are a downhill day's.
  expect(screen.queryByText("How was the snow?")).toBeNull();
});

test("over the map: «Your day», walked", async () => {
  await render(<FreeFinishBanner />);
  expect(screen.getByText("Your day")).toBeOnTheScreen();
  expect(screen.getByText("White: where you walked.")).toBeOnTheScreen();
  expect(screen.queryByText("White: where you skied.")).toBeNull();
});

test("the approved text, in the four languages", () => {
  expect(translate("it", "White: where you walked.")).toBe(
    "Bianco: dove hai camminato.",
  );
  expect(translate("de", "White: where you walked.")).toBe(
    "Weiß: wo du gegangen bist.",
  );
  expect(translate("fr", "White: where you walked.")).toBe(
    "Blanc : là où tu as marché.",
  );
  expect(translate("es", "White: where you walked.")).toBe("Blanco: donde caminaste.");
  expect(translate("it", "Record your day")).toBe("Registra la giornata");
});
