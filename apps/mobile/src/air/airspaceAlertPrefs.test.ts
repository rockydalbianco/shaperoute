/**
 * When the pilot is warned (TASK-479 part E2): 1000 m across and 100 m up
 * or down at first, with the sound; kept; refused when not one of the
 * choices.
 */
import type { KeptList } from "../storage/keptList";
import {
  type AirspaceAlertPrefs,
  DEFAULT_AIRSPACE_ALERTS,
  isAirspaceAlertPrefs,
  loadAirspaceAlerts,
  resetAirspaceAlerts,
  setAirspaceAlerts,
} from "./airspaceAlertPrefs";

function memory(): KeptList<AirspaceAlertPrefs> & { items: AirspaceAlertPrefs[] } {
  const list = {
    items: [] as AirspaceAlertPrefs[],
    load: () => list.items,
    save: (items: AirspaceAlertPrefs[]) => {
      list.items = items;
      return true;
    },
  };
  return list;
}

beforeEach(() => resetAirspaceAlerts());

it("start at 1000 m across, 100 m up or down, with the sound", () => {
  expect(loadAirspaceAlerts(memory())).toEqual({
    horizontalM: 1000,
    verticalM: 100,
    sound: true,
  });
});

it("are kept, and refused when not one of the choices", () => {
  const list = memory();
  setAirspaceAlerts({ horizontalM: 2000, verticalM: 50, sound: false }, list);
  expect(loadAirspaceAlerts(list)).toEqual({
    horizontalM: 2000,
    verticalM: 50,
    sound: false,
  });
  expect(isAirspaceAlertPrefs({ ...DEFAULT_AIRSPACE_ALERTS, horizontalM: 750 })).toBe(
    false,
  );
  expect(isAirspaceAlertPrefs(null)).toBe(false);
});
