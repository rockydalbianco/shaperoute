/**
 * The waypoint and task rows of the flight options (TASK-479 part D1): a
 * file of each loaded from «Files», what was read, the file's name and
 * day, «Remove»; a file that is not one says so.
 */
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";

import { color } from "../theme/tokens";
import {
  addManualWaypoint,
  manualWaypointsNow,
  removeManualWaypoints,
  resetManualWaypoints,
} from "./manualWaypoints";
import { pickTask, pickWaypoints } from "./waypointFile";
import { gateTime, NO_WAYPOINTS, NOT_A_TASK, WaypointOptions } from "./WaypointOptions";
import {
  resetWaypointStore,
  setTask,
  setWaypoints,
  taskNow,
  waypointsNow,
} from "./waypointStore";

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

jest.mock("./airspaceFile", () => ({
  ...jest.requireActual("./airspaceFile"),
  airspacePickerAvailable: () => true,
}));

jest.mock("./waypointFile", () => ({
  ...jest.requireActual("./waypointFile"),
  pickWaypoints: jest.fn(),
  pickTask: jest.fn(),
}));

const { taskOf, waypointsOf } =
  jest.requireActual<typeof import("./waypointFile")>("./waypointFile");

// Invented: no real waypoints in the repository.
const CUP = [
  "name,code,country,lat,lon,elev,style,rwdir,rwlen,freq,desc",
  '"Test Launch",TL,IT,4544.130N,01050.100E,1750m,1,,,,',
  '"Test Field",TF,IT,4542.000N,01048.000E,300m,3,,,,',
  "nonsense line",
].join("\n");

const XCTSK = JSON.stringify({
  taskType: "CLASSIC",
  version: 1,
  turnpoints: [
    { type: "TAKEOFF", radius: 400, waypoint: { name: "A", lat: 45.7, lon: 10.8 } },
    { type: "SSS", radius: 3000, waypoint: { name: "B", lat: 45.75, lon: 10.85 } },
    { radius: 400, waypoint: { name: "C", lat: 45.8, lon: 10.9 } },
  ],
  sss: { type: "RACE", direction: "EXIT", timeGates: ["11:00:00Z"] },
  goal: { type: "CYLINDER" },
});

const DAY = Date.UTC(2026, 10, 23, 8, 0, 0);

function show() {
  return render(
    <WaypointOptions
      chip={(key, label, _on, onPress) => (
        <Pressable key={key} onPress={onPress} accessibilityRole="button" testID={key}>
          <Text>{label}</Text>
        </Pressable>
      )}
      row={(title, chips) => (
        <View>
          <Text>{title}</Text>
          {chips}
        </View>
      )}
      palette={color}
      nowMs={DAY}
    />,
  );
}

beforeEach(() => {
  setWaypoints(null);
  setTask(null);
  resetWaypointStore();
  jest.mocked(pickWaypoints).mockReset();
  jest.mocked(pickTask).mockReset();
});

describe("WaypointOptions", () => {
  it("offers to load each, and nothing to remove without files", async () => {
    await show();
    expect(screen.getByText("Waypoints")).toBeTruthy();
    expect(screen.getByText("Task")).toBeTruthy();
    expect(screen.getByTestId("load-waypoints")).toBeTruthy();
    expect(screen.getByTestId("load-task")).toBeTruthy();
    expect(screen.queryByTestId("remove-waypoints")).toBeNull();
    expect(screen.queryByTestId("remove-task")).toBeNull();
  });

  it("loads waypoints and says what it read, with the file and day", async () => {
    const made = waypointsOf(CUP, "test.cup", DAY);
    jest
      .mocked(pickWaypoints)
      .mockResolvedValue("loaded" in made ? made : { canceled: true });
    await show();
    await fireEvent.press(screen.getByTestId("load-waypoints"));
    expect(
      screen.getByText("Waypoints: 2 · Landings: 1 · Lines not read: 1"),
    ).toBeTruthy();
    expect(screen.getByTestId("waypoints-file")).toHaveTextContent(
      /^test\.cup · loaded /,
    );
    await fireEvent.press(screen.getByTestId("remove-waypoints"));
    expect(waypointsNow()).toBeNull();
  });

  it("loads a task and says its turnpoints and first start", async () => {
    const made = taskOf(XCTSK, "test.xctsk", DAY);
    jest
      .mocked(pickTask)
      .mockResolvedValue("loaded" in made ? made : { canceled: true });
    await show();
    await fireEvent.press(screen.getByTestId("load-task"));
    const start = gateTime("11:00:00Z", DAY) ?? "";
    expect(screen.getByText(`Turnpoints: 3 · First start: ${start}`)).toBeTruthy();
    expect(screen.getByTestId("task-file")).toHaveTextContent(/^test\.xctsk · loaded /);
    await fireEvent.press(screen.getByTestId("remove-task"));
    expect(taskNow()).toBeNull();
  });

  it("says when a file has no waypoints, or is not a task", async () => {
    jest.mocked(pickWaypoints).mockResolvedValue({ error: "empty" });
    jest.mocked(pickTask).mockResolvedValue({ error: "notTask" });
    await show();
    await fireEvent.press(screen.getByTestId("load-waypoints"));
    expect(screen.getByTestId("waypoint-note")).toHaveTextContent(NO_WAYPOINTS);
    await fireEvent.press(screen.getByTestId("load-task"));
    expect(screen.getByTestId("waypoint-note")).toHaveTextContent(NOT_A_TASK);
  });
});

describe("gateTime", () => {
  it("reads a UTC gate, and nothing that is not one", () => {
    expect(gateTime("11:00:00Z", DAY)).not.toBeNull();
    expect(gateTime("noon", DAY)).toBeNull();
  });
});

describe("the pilot's own waypoints (D5)", () => {
  beforeEach(() => {
    resetManualWaypoints();
    removeManualWaypoints();
  });

  it("says how to add one when there is none", async () => {
    await show();
    expect(screen.getByText("My waypoints")).toBeTruthy();
    expect(screen.getByText("Press the flight map long to add one.")).toBeTruthy();
    expect(screen.queryByTestId("remove-manual")).toBeNull();
  });

  it("counts them and removes them all", async () => {
    addManualWaypoint([45.7, 10.8], false);
    addManualWaypoint([45.71, 10.81], true);
    await show();
    expect(screen.getByTestId("manual-waypoints").props.children).toBe(
      "Waypoints: 2 · Landings: 1",
    );
    await fireEvent.press(screen.getByTestId("remove-manual"));
    expect(manualWaypointsNow()).toEqual([]);
  });
});
