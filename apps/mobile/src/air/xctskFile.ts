import type { FlightTask } from "./flightTask";

/**
 * The pilot's task as an XCTrack task file (TASK-479 part D4, ADR-0388):
 * the `.xctsk` JSON of version 1, as XCTrack and the competition tools
 * read it. Times as the file had them, «HH:MM:SSZ» in UTC. The start's
 * direction is written though XCTrack's format calls it obsolete: the
 * format asks writers to keep it.
 */

export const XCTSK_MIME = "application/xctsk";

type Kind = "TAKEOFF" | "SSS" | "ESS";

/** The task's turnpoints' types: the goal is the end of speed section too
 * when no other turnpoint is (the format wants one). */
export function typesOf(task: FlightTask): (Kind | null)[] {
  const hasEss = task.turnpoints.some((one) => one.kind === "ess");
  const last = task.turnpoints.length - 1;
  return task.turnpoints.map((one, index) => {
    switch (one.kind) {
      case "takeoff":
        return "TAKEOFF";
      case "start":
        return "SSS";
      case "ess":
        return "ESS";
      default:
        return index === last && !hasEss ? "ESS" : null;
    }
  });
}

/** The `.xctsk` text of `task`. */
export function xctskOf(task: FlightTask): string {
  const types = typesOf(task);
  const file: Record<string, unknown> = {
    taskType: "CLASSIC",
    version: 1,
    earthModel: task.earth === "faiSphere" ? "FAI_SPHERE" : "WGS84",
    turnpoints: task.turnpoints.map((one, index) => {
      const { waypoint } = one;
      return {
        ...(types[index] === null ? {} : { type: types[index] }),
        radius: Math.round(one.radiusM),
        waypoint: {
          name: waypoint.name,
          ...(waypoint.description === null
            ? {}
            : { description: waypoint.description }),
          lat: waypoint.point[0],
          lon: waypoint.point[1],
          altSmoothed: Math.round(waypoint.altM ?? 0),
        },
      };
    }),
  };
  if (task.start !== null) {
    file.sss = {
      type: task.start.race ? "RACE" : "ELAPSED-TIME",
      direction: task.start.direction === "exit" ? "EXIT" : "ENTER",
      timeGates: task.start.gates,
    };
  }
  file.goal = {
    type: task.goal.type === "line" ? "LINE" : "CYLINDER",
    ...(task.goal.deadline === null ? {} : { deadline: task.goal.deadline }),
  };
  return JSON.stringify(file, null, 2);
}
