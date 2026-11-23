/**
 * The pilot's airspace file, kept (TASK-479 part E1): kept and read back,
 * taken away, refused when not whole, shared with who shows it.
 */
import { act, renderHook } from "@testing-library/react-native";

import type { KeptList } from "../storage/keptList";
import { airspaceOf } from "./airspaceFile";
import {
  isLoadedAirspace,
  loadAirspace,
  type LoadedAirspace,
  resetAirspace,
  setAirspace,
  useAirspace,
} from "./airspaceStore";

// Invented: no real airspace in the repository.
const TEXT = `AC R
AN TEST BOX
AL GND
AH 3000ft
DP 45:00:00 N 010:00:00 E
DP 45:00:00 N 010:05:00 E
DP 45:05:00 N 010:05:00 E
QQ not OpenAir`;

function memory(ok = true): KeptList<LoadedAirspace> & { items: LoadedAirspace[] } {
  const list = {
    items: [] as LoadedAirspace[],
    load: () => list.items,
    save: (items: LoadedAirspace[]) => {
      if (ok) {
        list.items = items;
      }
      return ok;
    },
  };
  return list;
}

beforeEach(() => resetAirspace());

it("makes a file's text a loaded airspace, with its name, day and unread lines", () => {
  const made = airspaceOf(TEXT, "test.txt", 1_000);
  expect(made).toMatchObject({
    loaded: { fileName: "test.txt", loadedAtMs: 1_000, unread: 1 },
  });
  expect(airspaceOf("nothing here", "x.txt", 0)).toEqual({ error: "empty" });
});

it("is kept, read back and taken away", () => {
  const list = memory();
  const made = airspaceOf(TEXT, "test.txt", 1_000);
  if (!("loaded" in made)) {
    throw new Error("not read");
  }
  expect(setAirspace(made.loaded, list)).toBe(true);
  expect(loadAirspace(list)).toEqual(made.loaded);
  expect(setAirspace(null, list)).toBe(true);
  expect(loadAirspace(list)).toBeNull();
});

it("keeps the one of before when the phone refuses to write", () => {
  const made = airspaceOf(TEXT, "test.txt", 1_000);
  if (!("loaded" in made)) {
    throw new Error("not read");
  }
  expect(setAirspace(made.loaded, memory(false))).toBe(false);
});

it("is refused when not whole", () => {
  expect(
    isLoadedAirspace({ fileName: "a", loadedAtMs: 0, unread: 0, airspaces: [] }),
  ).toBe(true);
  expect(
    isLoadedAirspace({
      fileName: "a",
      loadedAtMs: 0,
      unread: 0,
      airspaces: [{ class: "R", name: "x", floor: {}, ceiling: {}, points: [] }],
    }),
  ).toBe(false);
  expect(isLoadedAirspace(null)).toBe(false);
});

it("reaches who shows it at once", async () => {
  const list = memory();
  const { result } = await renderHook(() => useAirspace());
  expect(result.current).toBeNull();
  const made = airspaceOf(TEXT, "test.txt", 1_000);
  if (!("loaded" in made)) {
    throw new Error("not read");
  }
  await act(async () => {
    setAirspace(made.loaded, list);
  });
  expect(result.current?.fileName).toBe("test.txt");
});
