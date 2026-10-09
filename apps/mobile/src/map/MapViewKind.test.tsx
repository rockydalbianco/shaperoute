import type { LatLon } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveMapKind } from "./mapKind";
import { MapView } from "./MapView";

// The map's kind (TASK-264): the page is told the kind chosen with the
// button, at once, and again when it loads anew.

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

function pagePosts(data: string) {
  return fireEvent(screen.getByTestId("map"), "message", { nativeEvent: { data } });
}

/** The kinds handed to the page, in order. */
function kinds(): unknown[] {
  return injectJavaScript.mock.calls
    .map(([script]: [string]) => /receive\((.*)\); true;$/.exec(script)?.[1])
    .filter((json): json is string => json !== undefined)
    .map((json) => JSON.parse(json) as { type: string; kind?: unknown })
    .filter((message) => message.type === "setKind")
    .map((message) => message.kind);
}

beforeEach(() => {
  injectJavaScript.mockClear();
});

afterEach(async () => {
  await act(async () => saveMapKind("standard"));
});

test("the standard map is not told anything: the page starts as it", async () => {
  await render(<MapView start={TRENTO} route={null} onError={jest.fn()} />);
  await pagePosts('{"type":"ready"}');
  expect(kinds()).toEqual([]);
});

test("a kind chosen is told to the page at once, and so is the way back", async () => {
  await render(<MapView start={TRENTO} route={null} onError={jest.fn()} />);
  await pagePosts('{"type":"ready"}');
  await act(async () => saveMapKind("3d"));
  await act(async () => saveMapKind("satellite"));
  await act(async () => saveMapKind("standard"));
  expect(kinds()).toEqual(["3d", "satellite", "standard"]);
});

test("a kind kept from before is told as soon as the page is ready", async () => {
  await act(async () => saveMapKind("satellite"));
  await render(<MapView start={TRENTO} route={null} onError={jest.fn()} />);
  expect(kinds()).toEqual([]);
  await pagePosts('{"type":"ready"}');
  expect(kinds()).toEqual(["satellite"]);
});

test("a page that loads again is told the kind again", async () => {
  await act(async () => saveMapKind("3d"));
  await render(<MapView start={TRENTO} route={null} onError={jest.fn()} />);
  await pagePosts('{"type":"ready"}');
  await fireEvent(screen.getByTestId("map"), "loadStart");
  await pagePosts('{"type":"ready"}');
  expect(kinds()).toEqual(["3d", "3d"]);
});
