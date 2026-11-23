/**
 * A competition task from an XCTrack file (TASK-479 part D1), invented.
 */
import { readTask } from "./flightTask";

const point = (name: string, lat: number, lon: number) => ({
  name,
  lat,
  lon,
  altSmoothed: 1000,
  description: "",
});

const TASK = {
  taskType: "CLASSIC",
  version: 1,
  earthModel: "WGS84",
  turnpoints: [
    { type: "TAKEOFF", radius: 400, waypoint: point("LAUNCH", 45.73, 10.83) },
    { type: "SSS", radius: 3000, waypoint: point("START", 45.74, 10.86) },
    { radius: 1000, waypoint: point("TP1", 45.8, 10.9) },
    { type: "ESS", radius: 2000, waypoint: point("ESS", 45.7, 10.95) },
    { radius: 400, waypoint: point("GOAL", 45.69, 10.96) },
  ],
  sss: { type: "RACE", direction: "EXIT", timeGates: ["11:00:00Z", "11:15:00Z"] },
  goal: { type: "LINE", deadline: "17:00:00Z" },
};

describe("readTask", () => {
  it("reads the turnpoints in order, with their kind and cylinder", () => {
    const result = readTask(JSON.stringify(TASK));
    if (!("task" in result)) {
      throw new Error("no task");
    }
    const { task } = result;
    expect(task.turnpoints.map((one) => one.kind)).toEqual([
      "takeoff",
      "start",
      "turnpoint",
      "ess",
      "goal",
    ]);
    expect(task.turnpoints[1].radiusM).toBe(3000);
    expect(task.turnpoints[2].waypoint.point).toEqual([45.8, 10.9]);
    expect(task.turnpoints[2].waypoint.description).toBeNull();
    expect(task.start).toEqual({
      direction: "exit",
      gates: ["11:00:00Z", "11:15:00Z"],
      race: true,
    });
    expect(task.goal).toEqual({ type: "line", deadline: "17:00:00Z" });
    expect(task.earth).toBe("wgs84");
  });

  it("knows the FAI sphere, an entry start, a goal cylinder and no start", () => {
    const sphere = readTask(
      JSON.stringify({
        ...TASK,
        earthModel: "FAI_SPHERE",
        sss: { type: "ELAPSED-TIME", direction: "ENTER", timeGates: [] },
        goal: {},
      }),
    );
    expect("task" in sphere && sphere.task.earth).toBe("faiSphere");
    expect("task" in sphere && sphere.task.start).toEqual({
      direction: "enter",
      gates: [],
      race: false,
    });
    expect("task" in sphere && sphere.task.goal).toEqual({
      type: "cylinder",
      deadline: null,
    });
    const free = readTask(JSON.stringify({ ...TASK, sss: undefined }));
    expect("task" in free && free.task.start).toBeNull();
  });

  it("says when it is not a task, or a turnpoint cannot be read", () => {
    expect(readTask("not json")).toEqual({ error: "notTask" });
    expect(readTask(JSON.stringify({ hello: 1 }))).toEqual({ error: "notTask" });
    const broken = { ...TASK, turnpoints: [TASK.turnpoints[0], { radius: 100 }] };
    expect(readTask(JSON.stringify(broken))).toEqual({ error: "noTurnpoints" });
    const one = { ...TASK, turnpoints: [TASK.turnpoints[0]] };
    expect(readTask(JSON.stringify(one))).toEqual({ error: "noTurnpoints" });
  });
});
