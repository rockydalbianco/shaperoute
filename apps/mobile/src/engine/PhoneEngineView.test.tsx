import { act, render, screen } from "@testing-library/react-native";
import { Asset } from "expo-asset";
import { StyleSheet } from "react-native";

import { files } from "./memoryFiles";
import { ENGINE_PAGE, pageCall } from "./page";
import { commonDirectory, PhoneEngineView } from "./PhoneEngineView";
import { PhoneEngine } from "./phoneEngine";

jest.mock("expo-file-system", () => jest.requireActual("./memoryFiles"));
jest.mock("expo-asset", () => ({ Asset: { loadAsync: jest.fn() } }));
jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const PYODIDE = "file:///cache/ExponentAsset-1.zip";
const ENGINE = "file:///cache/ExponentAsset-2.zip";

beforeEach(() => {
  files.clear();
  injectJavaScript.mockClear();
  jest
    .mocked(Asset.loadAsync)
    .mockResolvedValue([{ localUri: PYODIDE }, { localUri: ENGINE }] as Asset[]);
});

test("the readable folder holds the page, the zones and the two zips", () => {
  expect(
    commonDirectory([
      "file:///documents/engine/index.html",
      "file:///documents/engine/zones/x",
      PYODIDE,
      ENGINE,
    ]),
  ).toBe("file:///");
  expect(commonDirectory(["file:///a/b/c.html", "file:///a/b/d/e.zip"])).toBe(
    "file:///a/b/",
  );
});

test("nothing is mounted until the engine is wanted, then a WebView out of sight", async () => {
  const engine = new PhoneEngine();
  await render(<PhoneEngineView engine={engine} />);
  expect(screen.queryByTestId("phone-engine")).toBeNull();

  await act(async () => {
    engine.warmUp();
  });
  const view = await screen.findByTestId("phone-engine");
  expect(files.get("file:///documents/engine/index.html")).toBe(ENGINE_PAGE);
  expect(view.props.source).toEqual({ uri: "file:///documents/engine/index.html" });
  expect(view.props.allowingReadAccessToURL).toBe("file:///");
  // Its container too: with flex 1 it took half the screen from the app.
  for (const style of [view.props.style, view.props.containerStyle]) {
    expect(StyleSheet.flatten(style)).toMatchObject({
      position: "absolute",
      width: 1,
      height: 1,
      opacity: 0,
    });
  }

  await act(async () => {
    view.props.onLoadEnd();
  });
  expect(injectJavaScript).toHaveBeenCalledWith(
    pageCall("boot", { pyodide: PYODIDE, engine: ENGINE }),
  );
  await act(async () => {
    view.props.onMessage({ nativeEvent: { data: '{"type":"ready","ms":5}' } });
  });
  expect(engine.last.bootMs).toBe(5);

  await act(async () => {
    view.props.onContentProcessDidTerminate();
  });
  expect(screen.queryByTestId("phone-engine")).toBeNull();
  expect(engine.available).toBe(true);
});

test("without the zips on the phone, every route goes to the server", async () => {
  jest.mocked(Asset.loadAsync).mockRejectedValue(new Error("no space"));
  const engine = new PhoneEngine();
  await render(<PhoneEngineView engine={engine} />);
  await act(async () => {
    engine.warmUp();
  });
  expect(engine.available).toBe(false);
  expect(screen.queryByTestId("phone-engine")).toBeNull();
});
