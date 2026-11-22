/**
 * How the pilot wants the flight map (TASK-479 part A1): 3D and heading up
 * at first, kept, shared with every map widget.
 */
import { act, renderHook } from "@testing-library/react-native";

import type { KeptList } from "../storage/keptList";
import {
  DEFAULT_FLIGHT_MAP,
  type FlightMapPrefs,
  isFlightMapPrefs,
  loadFlightMapPrefs,
  resetFlightMapPrefs,
  setFlightMapPrefs,
  useFlightMapPrefs,
} from "./flightMapPrefs";

function memory(): KeptList<FlightMapPrefs> & { items: FlightMapPrefs[] } {
  const list = {
    items: [] as FlightMapPrefs[],
    load: () => list.items,
    save: (items: FlightMapPrefs[]) => {
      list.items = items;
      return true;
    },
  };
  return list;
}

beforeEach(() => resetFlightMapPrefs());

it("start in 3D, heading up", () => {
  expect(loadFlightMapPrefs(memory())).toEqual({ threeD: true, headingUp: true });
});

it("are kept, and refused when not whole", () => {
  const list = memory();
  setFlightMapPrefs({ threeD: false, headingUp: false }, list);
  expect(loadFlightMapPrefs(list)).toEqual({ threeD: false, headingUp: false });
  expect(isFlightMapPrefs({ threeD: true })).toBe(false);
  expect(isFlightMapPrefs(null)).toBe(false);
});

it("reach every map widget at once", async () => {
  const list = memory();
  const { result } = await renderHook(() => useFlightMapPrefs());
  expect(result.current).toEqual(DEFAULT_FLIGHT_MAP);
  await act(async () => {
    setFlightMapPrefs({ threeD: false, headingUp: true }, list);
  });
  expect(result.current.threeD).toBe(false);
});
