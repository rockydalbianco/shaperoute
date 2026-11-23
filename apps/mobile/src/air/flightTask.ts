import type { Waypoint } from "./waypoints";

/**
 * A competition task from an XCTrack `.xctsk` file (TASK-479 part D1,
 * ADR-0388): the JSON of version 1, as XCTrack and the competition tools
 * write it. The turnpoints in order, each a cylinder; the start (entering
 * or leaving its cylinder, with its gates), the end of speed section, the
 * goal (a cylinder or a line). Read on the phone; flown in part D2.
 *
 * Times are as the file writes them, «HH:MM:SSZ» in UTC.
 */

export type TurnpointKind = "takeoff" | "start" | "turnpoint" | "ess" | "goal";

export type Turnpoint = {
  waypoint: Waypoint;
  radiusM: number;
  kind: TurnpointKind;
};

export type FlightTask = {
  /** How distances are measured: the WGS84 ellipsoid or the FAI sphere. */
  earth: "wgs84" | "faiSphere";
  turnpoints: Turnpoint[];
  start: { direction: "enter" | "exit"; gates: string[]; race: boolean } | null;
  goal: { type: "cylinder" | "line"; deadline: string | null };
};

export type TaskResult = { task: FlightTask } | { error: "notTask" | "noTurnpoints" };

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function waypointOf(value: unknown): Waypoint | null {
  const one = record(value);
  const lat = number(one?.lat);
  const lon = number(one?.lon);
  const name = text(one?.name);
  if (
    one === null ||
    lat === null ||
    lon === null ||
    name === null ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    return null;
  }
  return {
    name,
    code: null,
    point: [lat, lon],
    altM: number(one.altSmoothed),
    landing: false,
    description: text(one.description),
  };
}

function kindOf(type: unknown, index: number, last: number): TurnpointKind {
  if (index === last) {
    return "goal";
  }
  switch (type) {
    case "TAKEOFF":
      return "takeoff";
    case "SSS":
      return "start";
    case "ESS":
      return "ess";
    default:
      return "turnpoint";
  }
}

/** The task of an `.xctsk` file's text, or why not. */
export function readTask(json: string): TaskResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { error: "notTask" };
  }
  const root = record(parsed);
  if (root === null || !Array.isArray(root.turnpoints)) {
    return { error: "notTask" };
  }
  const raw = root.turnpoints
    .map((one) => {
      const point = record(one);
      const waypoint = waypointOf(point?.waypoint);
      const radiusM = number(point?.radius);
      return waypoint === null || radiusM === null || radiusM < 0
        ? null
        : { waypoint, radiusM, type: point?.type };
    })
    .filter((one) => one !== null);
  if (raw.length < 2 || raw.length !== root.turnpoints.length) {
    return { error: "noTurnpoints" };
  }
  const turnpoints: Turnpoint[] = raw.map((one, index) => ({
    waypoint: one.waypoint,
    radiusM: one.radiusM,
    kind: kindOf(one.type, index, raw.length - 1),
  }));
  const sss = record(root.sss);
  const goal = record(root.goal);
  const gates = Array.isArray(sss?.timeGates)
    ? sss.timeGates.filter((gate): gate is string => typeof gate === "string")
    : [];
  return {
    task: {
      earth: root.earthModel === "FAI_SPHERE" ? "faiSphere" : "wgs84",
      turnpoints,
      start:
        sss === null
          ? null
          : {
              direction: sss.direction === "EXIT" ? "exit" : "enter",
              gates,
              race: sss.type !== "ELAPSED-TIME",
            },
      goal: {
        type: goal?.type === "LINE" ? "line" : "cylinder",
        deadline: text(goal?.deadline),
      },
    },
  };
}
