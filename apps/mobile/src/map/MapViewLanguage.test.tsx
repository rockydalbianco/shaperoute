import type { LatLon } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { buildMapPage } from "./mapPage";
import { MapView } from "./MapView";

// The map in the app's language (TASK-210, part F): the names of places
// and «Start here», at once when «Settings» changes the language.

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

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

const TRENTO: LatLon = [46.0671, 11.1214];

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test.each([
  ["en", "Start here"],
  ["de", "Hier starten"],
  ["it", "Parti da qui"],
  ["es", "Empieza aquí"],
  ["fr", "Départ ici"],
] as const)("the page in «%s» says «%s» and names places in it", (language, label) => {
  const page = buildMapPage(language);
  expect(page).toContain(`.setText(${JSON.stringify(label)})`);
  expect(page).toContain(`"name:${language}"`);
  // The names are no longer Italian whatever the language.
  expect(page.includes('"name:it"')).toBe(language === "it");
});

test("the page is in the app's language when none is given", async () => {
  await act(async () => saveLanguageChoice("es"));
  expect(buildMapPage()).toBe(buildMapPage("es"));
});

test("a new language loads the map again in it, and the map is told everything again", async () => {
  await render(<MapView start={TRENTO} route={null} onError={() => {}} />);
  const html = () =>
    (screen.getByTestId("map").props as { source: { html: string } }).source.html;
  expect(html()).toBe(buildMapPage("en"));
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
  const told = injectJavaScript.mock.calls.length;
  expect(told).toBeGreaterThan(0);

  await act(async () => saveLanguageChoice("de"));
  expect(html()).toBe(buildMapPage("de"));
  expect(html()).toContain("Hier starten");
  // The page loads again, says it is ready, and has the start again.
  await fireEvent(screen.getByTestId("map"), "loadStart");
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
  expect(injectJavaScript.mock.calls.length).toBeGreaterThan(told);
});
