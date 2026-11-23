/**
 * The pilot's waypoints and task kept on the phone (TASK-479 part D1):
 * one of each, read back as written, taken away with null.
 */
import type { FlightTask } from "./flightTask";
import {
  isLoadedTask,
  isLoadedWaypoints,
  type LoadedTask,
  type LoadedWaypoints,
  resetWaypointStore,
  setTask,
  setWaypoints,
  taskNow,
  waypointsNow,
} from "./waypointStore";
import type { Waypoint } from "./waypoints";

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

const POINT: Waypoint = {
  name: "LAUNCH",
  code: null,
  point: [45.7355, 10.835],
  altM: 1750,
  landing: false,
  description: null,
};
const WAYPOINTS: LoadedWaypoints = {
  fileName: "test.cup",
  loadedAtMs: 1,
  waypoints: [POINT, { ...POINT, name: "FIELD", landing: true }],
  unread: 0,
};
const TASK: FlightTask = {
  earth: "wgs84",
  turnpoints: [
    { waypoint: POINT, radiusM: 400, kind: "takeoff" },
    { waypoint: { ...POINT, name: "GOAL" }, radiusM: 400, kind: "goal" },
  ],
  start: null,
  goal: { type: "cylinder", deadline: null },
};
const LOADED_TASK: LoadedTask = { fileName: "test.xctsk", loadedAtMs: 2, task: TASK };

beforeEach(() => {
  setWaypoints(null);
  setTask(null);
  resetWaypointStore();
});

describe("waypointStore", () => {
  it("keeps one waypoint file and one task, read back after a restart", () => {
    expect(waypointsNow()).toBeNull();
    expect(taskNow()).toBeNull();
    expect(setWaypoints(WAYPOINTS)).toBe(true);
    expect(setTask(LOADED_TASK)).toBe(true);
    resetWaypointStore();
    expect(waypointsNow()).toEqual(WAYPOINTS);
    expect(taskNow()).toEqual(LOADED_TASK);
  });

  it("takes each away on its own", () => {
    setWaypoints(WAYPOINTS);
    setTask(LOADED_TASK);
    setWaypoints(null);
    resetWaypointStore();
    expect(waypointsNow()).toBeNull();
    expect(taskNow()).toEqual(LOADED_TASK);
  });

  it("checks what it reads", () => {
    expect(isLoadedWaypoints(WAYPOINTS)).toBe(true);
    expect(isLoadedWaypoints({ ...WAYPOINTS, waypoints: [{ name: 1 }] })).toBe(false);
    expect(isLoadedTask(LOADED_TASK)).toBe(true);
    expect(
      isLoadedTask({
        ...LOADED_TASK,
        task: { ...TASK, turnpoints: [TASK.turnpoints[0]] },
      }),
    ).toBe(false);
  });
});
