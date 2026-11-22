/**
 * The vario's sound choices (TASK-479 part C): the defaults, kept and read
 * back, refused when not whole, shared between who changes them and who
 * plays.
 */
import { act, renderHook } from "@testing-library/react-native";

import type { KeptList } from "../storage/keptList";
import {
  DEFAULT_VARIO_PREFS,
  isVarioPrefs,
  loadVarioPrefs,
  resetVarioPrefs,
  saveVarioPrefs,
  setVarioPrefs,
  thresholdsOf,
  useVarioPrefs,
  type VarioPrefs,
  varioPrefsNow,
} from "./varioPrefs";

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

function memory(): KeptList<VarioPrefs> & { items: VarioPrefs[] } {
  const list = {
    items: [] as VarioPrefs[],
    load: () => list.items,
    save: (items: VarioPrefs[]) => {
      list.items = items;
      return true;
    },
  };
  return list;
}

beforeEach(() => resetVarioPrefs());

it("start on, beeping from +0.2 m/s, low below −2.5 m/s, loud", () => {
  expect(loadVarioPrefs(memory())).toEqual({
    on: true,
    climbFromMps: 0.2,
    sinkBelowMps: -2.5,
    volume: "high",
  });
  expect(thresholdsOf(DEFAULT_VARIO_PREFS)).toEqual({
    climbFromMps: 0.2,
    sinkBelowMps: -2.5,
  });
});

it("are kept and read back", () => {
  const list = memory();
  const prefs: VarioPrefs = {
    on: false,
    climbFromMps: 0.5,
    sinkBelowMps: null,
    volume: "low",
  };
  expect(saveVarioPrefs(prefs, list)).toBe(true);
  expect(loadVarioPrefs(list)).toEqual(prefs);
});

it("are refused when not whole or not one of the choices", () => {
  expect(isVarioPrefs(DEFAULT_VARIO_PREFS)).toBe(true);
  expect(isVarioPrefs({ ...DEFAULT_VARIO_PREFS, climbFromMps: 0.25 })).toBe(false);
  expect(isVarioPrefs({ ...DEFAULT_VARIO_PREFS, sinkBelowMps: -9 })).toBe(false);
  expect(isVarioPrefs({ ...DEFAULT_VARIO_PREFS, volume: "max" })).toBe(false);
  expect(isVarioPrefs({ ...DEFAULT_VARIO_PREFS, on: "yes" })).toBe(false);
  expect(isVarioPrefs(null)).toBe(false);
});

it("are shared: a change reaches who listens, and is kept on the phone", async () => {
  const { result } = await renderHook(() => useVarioPrefs());
  expect(result.current.on).toBe(true);
  await act(async () => {
    setVarioPrefs({ ...DEFAULT_VARIO_PREFS, on: false });
  });
  expect(result.current.on).toBe(false);
  // As when the app starts again: read from the file.
  resetVarioPrefs();
  expect(varioPrefsNow().on).toBe(false);
});
