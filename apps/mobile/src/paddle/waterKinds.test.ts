import { files } from "../engine/memoryFiles";
import {
  loadWaterFilter,
  saveWaterFilter,
  shows,
  tapped,
  WATER_FILTER_FILE,
} from "./waterKinds";

jest.mock("expo-file-system", () => jest.requireActual("../engine/memoryFiles"));

beforeEach(() => {
  files.clear();
});

test("both kinds at first; a tap shows one alone, a second tap both again", () => {
  expect(loadWaterFilter()).toBe("all");
  expect(shows("all", "lake") && shows("all", "sea")).toBe(true);
  expect(tapped("all", "lake")).toBe("lake");
  expect(shows("lake", "lake")).toBe(true);
  expect(shows("lake", "sea")).toBe(false);
  expect(tapped("lake", "lake")).toBe("all");
  // The other one moves to it: never neither.
  expect(tapped("lake", "sea")).toBe("sea");
  expect(tapped("sea", "sea")).toBe("all");
});

test("the filter is remembered on the phone", () => {
  saveWaterFilter("sea");
  expect(files.get(`file:///documents/${WATER_FILTER_FILE}`)).toBe('{"filter":"sea"}');
  expect(loadWaterFilter()).toBe("sea");
  files.set(`file:///documents/${WATER_FILTER_FILE}`, '{"filter":"river"}');
  expect(loadWaterFilter()).toBe("all");
  files.set(`file:///documents/${WATER_FILTER_FILE}`, "nope");
  expect(loadWaterFilter()).toBe("all");
});
