import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { appMapKind, saveMapKind } from "./mapKind";
import { MapKindButton } from "./MapKindButton";

// The documents folder in memory, so the kind chosen is kept as on a phone.
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

afterEach(async () => {
  await act(async () => saveMapKind("standard"));
});

test("closed, it is a button that says what it is and the kind shown", async () => {
  await render(<MapKindButton />);
  const button = screen.getByRole("button", { name: "Map type" });
  expect(button.props.accessibilityValue).toEqual({ text: "Standard" });
  expect(screen.queryByText("Satellite")).toBeNull();
});

test("a tap shows the three kinds, the one shown ticked", async () => {
  await render(<MapKindButton />);
  await fireEvent.press(screen.getByTestId("map-kind"));
  expect(screen.getByText("Standard")).toBeTruthy();
  expect(screen.getByText("Satellite")).toBeTruthy();
  expect(screen.getByText("3D")).toBeTruthy();
  expect(screen.getByTestId("map-kind-standard").props.accessibilityState).toEqual({
    selected: true,
  });
  expect(screen.getByTestId("map-kind-3d").props.accessibilityState).toEqual({
    selected: false,
  });
  expect(screen.getAllByText("✓")).toHaveLength(1);
});

test("a kind chosen is the map's, and the choices close", async () => {
  await render(<MapKindButton />);
  await fireEvent.press(screen.getByTestId("map-kind"));
  await fireEvent.press(screen.getByTestId("map-kind-satellite"));
  expect(appMapKind()).toBe("satellite");
  expect(screen.queryByTestId("map-kind-satellite")).toBeNull();
  expect(screen.getByTestId("map-kind").props.accessibilityValue).toEqual({
    text: "Satellite",
  });
});

test("a second tap on the button closes the choices", async () => {
  await render(<MapKindButton />);
  await fireEvent.press(screen.getByTestId("map-kind"));
  await fireEvent.press(screen.getByTestId("map-kind"));
  expect(screen.queryByTestId("map-kind-3d")).toBeNull();
  expect(appMapKind()).toBe("standard");
});
