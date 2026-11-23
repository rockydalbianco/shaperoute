import { fireEvent, render, screen } from "@testing-library/react-native";
import { File, Paths } from "expo-file-system";

import { DayChoices } from "./DayChoices";
import { loadGear, loadSnow, saveGear, SKI_DAY_FILE } from "./skiDayStore";

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

// The snow and the gear at the end of a day of skiing (TASK-406 part D2).

beforeEach(() => {
  const file = new File(Paths.document, SKI_DAY_FILE);
  if (file.exists) {
    file.delete();
  }
});

test("five snows, one or none, kept as chosen", async () => {
  await render(<DayChoices />);
  expect(screen.getByText("How was the snow?")).toBeOnTheScreen();
  for (const name of ["Powder", "Groomed", "Icy", "Spring", "Heavy"]) {
    expect(screen.getByText(name)).toBeOnTheScreen();
  }
  await fireEvent.press(screen.getByTestId("snow-groomed"));
  expect(loadSnow()).toBe("groomed");
  expect(screen.getByTestId("snow-groomed")).toBeSelected();
  await fireEvent.press(screen.getByTestId("snow-icy"));
  expect(loadSnow()).toBe("icy");
  expect(screen.getByTestId("snow-groomed")).not.toBeSelected();
  // The same again takes it away.
  await fireEvent.press(screen.getByTestId("snow-icy"));
  expect(loadSnow()).toBeNull();
});

test("the gear of the last day fills the field, and stays as written", async () => {
  saveGear("Ski Atomic Redster");
  await render(<DayChoices />);
  const field = screen.getByLabelText("Your gear");
  expect(field.props.value).toBe("Ski Atomic Redster");
  expect(field.props.placeholder).toBe("Ski or snowboard, brand and model");
  await fireEvent.changeText(field, "Snowboard Burton");
  expect(loadGear()).toBe("Snowboard Burton");
});
