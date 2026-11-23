/**
 * The airspace rows of the flight options (TASK-479 part E1): the approved
 * notice when nothing is loaded; once a file is loaded, how many volumes,
 * the lines not read, and the approved notice with its name and day; a file
 * with nothing to read says so; «Remove» takes it away.
 */
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";

import { color } from "../theme/tokens";
import { pickAirspace } from "./airspaceFile";
import { AirspaceOptions, NO_AIRSPACE } from "./AirspaceOptions";
import { airspaceAlertsNow, resetAirspaceAlerts } from "./airspaceAlertPrefs";
import { airspaceNow, resetAirspace, setAirspace } from "./airspaceStore";

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
  pickAirspace: jest.fn(),
}));

const { airspaceOf } =
  jest.requireActual<typeof import("./airspaceFile")>("./airspaceFile");

// Invented: no real airspace in the repository.
const TEXT = `AC R
AN TEST BOX
AL GND
AH 3000ft
DP 45:00:00 N 010:00:00 E
DP 45:00:00 N 010:05:00 E
DP 45:05:00 N 010:05:00 E
QQ not OpenAir`;

function show() {
  return render(
    <AirspaceOptions
      chip={(key, label, _on, onPress) => (
        <Pressable key={key} onPress={onPress} accessibilityRole="button">
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
    />,
  );
}

beforeEach(() => {
  resetAirspace();
  // The file of the test before, gone.
  setAirspace(null);
  resetAirspaceAlerts();
  jest.mocked(pickAirspace).mockReset();
});

it("says MuW includes no airspace when none is loaded", async () => {
  await show();
  expect(screen.getByText(NO_AIRSPACE)).toBeTruthy();
  expect(screen.queryByText("Remove")).toBeNull();
});

it("loads a file: its volumes, its unread lines, its name and day", async () => {
  jest
    .mocked(pickAirspace)
    .mockResolvedValue(
      airspaceOf(TEXT, "alps-test.txt", Date.UTC(2026, 10, 22)) as never,
    );
  await show();
  await fireEvent.press(screen.getByText("Load file"));
  expect(screen.getByText("Airspaces: 1 · Lines not read: 1")).toBeTruthy();
  const notice = screen.getByTestId("airspace-loaded");
  expect(notice.props.children).toContain("alps-test.txt");
  expect(notice.props.children).toContain(
    "Data loaded by you: check the AIP and NOTAMs before you fly.",
  );
  expect(airspaceNow()?.fileName).toBe("alps-test.txt");
});

it("says when a file has nothing to read, and keeps what was there", async () => {
  jest.mocked(pickAirspace).mockResolvedValue({ error: "empty" });
  await show();
  await fireEvent.press(screen.getByText("Load file"));
  expect(screen.getByText("This file has no airspace MuW can read.")).toBeTruthy();
  expect(airspaceNow()).toBeNull();
});

it("takes the file away with «Remove»", async () => {
  jest.mocked(pickAirspace).mockResolvedValue(airspaceOf(TEXT, "a.txt", 0) as never);
  await show();
  await fireEvent.press(screen.getByText("Load file"));
  await fireEvent.press(screen.getByText("Remove"));
  expect(airspaceNow()).toBeNull();
  expect(screen.getByText(NO_AIRSPACE)).toBeTruthy();
});

it("sets how near the warning comes, once a file is loaded", async () => {
  jest.mocked(pickAirspace).mockResolvedValue(airspaceOf(TEXT, "a.txt", 0) as never);
  await show();
  expect(screen.queryByText("Warn within")).toBeNull();
  await fireEvent.press(screen.getByText("Load file"));
  expect(screen.getByText("Warn within")).toBeTruthy();
  expect(screen.getByText("Warn above or below")).toBeTruthy();
  await fireEvent.press(screen.getByText("2.0 km"));
  await fireEvent.press(screen.getByText("50 m"));
  expect(airspaceAlertsNow()).toMatchObject({ horizontalM: 2000, verticalM: 50 });
});
