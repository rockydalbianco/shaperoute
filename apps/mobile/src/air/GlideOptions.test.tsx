import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";

import { GlideOptions } from "./GlideOptions";
import { glidePrefsNow, resetGlidePrefs } from "./glidePrefs";

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

beforeEach(() => resetGlidePrefs());

async function show() {
  await render(
    <View>
      <GlideOptions
        chip={(key, label, on, onPress) => (
          <Pressable key={key} onPress={onPress} accessibilityState={{ selected: on }}>
            <Text>{label}</Text>
          </Pressable>
        )}
        row={(title, chips) => (
          <View>
            <Text>{title}</Text>
            {chips}
          </View>
        )}
      />
    </View>,
  );
}

it("offers the glide ratio and the wind, 8 and estimated at first", async () => {
  await show();
  expect(screen.getByText("Glide ratio used")).toBeTruthy();
  expect(screen.getByText("Wind used")).toBeTruthy();
  expect(screen.getByText("8").parent?.props.accessibilityState).toEqual({
    selected: true,
  });
});

it("keeps what the pilot chooses", async () => {
  await show();
  await fireEvent.press(screen.getByText("10"));
  await fireEvent.press(screen.getByText("No wind"));
  expect(glidePrefsNow()).toEqual({ ld: 10, wind: "none" });
});
