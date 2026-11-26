import type { FlightTask, Turnpoint } from "./flightTask";
import { readTask } from "./flightTask";
import { xctskOf } from "./xctskFile";

function tp(
  name: string,
  lat: number,
  lon: number,
  r: number,
  kind: Turnpoint["kind"],
): Turnpoint {
  return {
    waypoint: {
      name,
      code: null,
      point: [lat, lon],
      altM: 900,
      landing: false,
      description: "invented",
    },
    radiusM: r,
    kind,
  };
}

// An invented task.
const TASK: FlightTask = {
  earth: "faiSphere",
  turnpoints: [
    tp("TEST TO", 45.7355, 10.835, 400, "takeoff"),
    tp("TEST SS", 45.7355, 10.835, 1500, "start"),
    tp("TEST B1", 45.7445, 10.9119, 1000, "turnpoint"),
    tp("TEST ES", 45.8165, 10.8735, 1000, "ess"),
    tp("TEST GO", 45.8255, 10.8607, 400, "goal"),
  ],
  start: { direction: "exit", gates: ["12:00:00Z"], race: true },
  goal: { type: "line", deadline: "17:00:00Z" },
};

describe("xctskOf", () => {
  it("writes a file MuW reads back as the same task", () => {
    expect(readTask(xctskOf(TASK))).toEqual({ task: TASK });
  });

  it("writes XCTrack's names: CLASSIC, version 1, the types, the earth", () => {
    const file = JSON.parse(xctskOf(TASK));
    expect(file.taskType).toBe("CLASSIC");
    expect(file.version).toBe(1);
    expect(file.earthModel).toBe("FAI_SPHERE");
    expect(file.turnpoints.map((one: { type?: string }) => one.type)).toEqual([
      "TAKEOFF",
      "SSS",
      undefined,
      "ESS",
      undefined,
    ]);
    expect(file.sss).toEqual({
      type: "RACE",
      direction: "EXIT",
      timeGates: ["12:00:00Z"],
    });
    expect(file.goal).toEqual({ type: "LINE", deadline: "17:00:00Z" });
    expect(file.turnpoints[2].waypoint).toEqual({
      name: "TEST B1",
      description: "invented",
      lat: 45.7445,
      lon: 10.9119,
      altSmoothed: 900,
    });
  });

  it("marks the goal as the end of speed section when no turnpoint is", () => {
    const task = {
      ...TASK,
      turnpoints: TASK.turnpoints.filter((one) => one.kind !== "ess"),
    };
    const file = JSON.parse(xctskOf(task));
    expect(file.turnpoints[file.turnpoints.length - 1].type).toBe("ESS");
  });
});
