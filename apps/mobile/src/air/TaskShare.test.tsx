import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Sharing from "expo-sharing";
import { Pressable, Text } from "react-native";

import { color } from "../theme/tokens";
import type { FlightTask, Turnpoint } from "./flightTask";
import { readTask } from "./flightTask";
import { shareTask, TaskShare, taskQr, xctskName } from "./TaskShare";

const written = new Map<string, string>();

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-file-system", () => {
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    create(): void {}
    write(text: string): void {
      written.set(this.uri, text);
    }
  }
  return { File, Paths: { cache: { uri: "file:///cache/" } } };
});

function tp(name: string, lat: number, kind: Turnpoint["kind"]): Turnpoint {
  return {
    waypoint: {
      name,
      code: null,
      point: [lat, 10.8],
      altM: 900,
      landing: false,
      description: null,
    },
    radiusM: 1000,
    kind,
  };
}

// An invented task.
const TASK: FlightTask = {
  earth: "wgs84",
  turnpoints: [
    tp("TEST SS", 45.7, "start"),
    tp("TEST B1", 45.8, "turnpoint"),
    tp("TEST GO", 45.9, "goal"),
  ],
  start: { direction: "enter", gates: ["12:00:00Z"], race: true },
  goal: { type: "cylinder", deadline: null },
};

beforeEach(() => {
  written.clear();
  jest.mocked(Sharing.shareAsync).mockClear();
});

it("names the file after the one loaded", () => {
  expect(xctskName("test-task.xctsk")).toBe("test-task.xctsk");
  expect(xctskName("my task.json")).toBe("my task.xctsk");
  expect(xctskName(".xctsk")).toBe("task.xctsk");
});

it("shares the task as an .xctsk file MuW reads back", async () => {
  expect(await shareTask(TASK, "test-task.xctsk")).toBe("shared");
  const text = written.get("file:///cache/test-task.xctsk")!;
  expect(readTask(text)).toEqual({ task: TASK });
  expect(jest.mocked(Sharing.shareAsync).mock.calls[0][1]).toMatchObject({
    mimeType: "application/xctsk",
  });
});

it("has a QR code for the task", () => {
  expect(taskQr(TASK)?.version).toBeGreaterThan(1);
});

it("shows the QR code on «Show QR»", async () => {
  await render(
    <TaskShare
      loaded={{ fileName: "test-task.xctsk", loadedAtMs: 0, task: TASK }}
      palette={color}
      chip={(key, label, _on, onPress) => (
        <Pressable key={key} onPress={onPress}>
          <Text>{label}</Text>
        </Pressable>
      )}
    />,
  );
  await fireEvent.press(screen.getByText("Show QR"));
  expect(screen.getByTestId("qr-code")).toBeTruthy();
  expect(screen.getByText("Task for XCTrack")).toBeTruthy();
});
