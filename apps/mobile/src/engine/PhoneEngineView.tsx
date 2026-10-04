import { Asset } from "expo-asset";
import { Directory, File, Paths } from "expo-file-system";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

import { ENGINE_PAGE } from "./page";
import { phoneEngine, type PhoneEngine } from "./phoneEngine";
import { zonesDirectory } from "./zones";

/** The page and what it reads, on the phone's disk. */
type Files = { page: string; readAccess: string; pyodide: string; engine: string };

const ENGINE_DIRECTORY = "engine";

/**
 * The longest directory that holds every one of `uris`: the WebView may read
 * the files under it (allowingReadAccessToURL), and nothing else.
 */
export function commonDirectory(uris: readonly string[]): string {
  const folders = uris.map((uri) => uri.slice(0, uri.lastIndexOf("/") + 1));
  let common = folders[0] ?? "";
  for (const folder of folders.slice(1)) {
    while (!folder.startsWith(common)) {
      common = common.slice(0, common.lastIndexOf("/", common.length - 2) + 1);
    }
  }
  return common;
}

/** Writes the page beside the zones and finds Pyodide and the engine,
 * downloaded once by expo-asset (from Metro, or with the app's update). */
async function prepare(): Promise<Files> {
  const [pyodide, engine] = await Asset.loadAsync([
    require("../../assets/engine/pyodide.zip"),
    require("../../assets/engine/engine.zip"),
  ]);
  if (!pyodide?.localUri || !engine?.localUri) {
    throw new Error("the engine's files are not on the phone");
  }
  const folder = new Directory(Paths.document, ENGINE_DIRECTORY);
  folder.create({ idempotent: true, intermediates: true });
  const page = new File(folder, "index.html");
  page.create({ overwrite: true });
  page.write(ENGINE_PAGE);
  const zones = zonesDirectory();
  zones.create({ idempotent: true, intermediates: true });
  return {
    page: page.uri,
    readAccess: commonDirectory([
      page.uri,
      `${zones.uri}x`,
      pyodide.localUri,
      engine.localUri,
    ]),
    pyodide: pyodide.localUri,
    engine: engine.localUri,
  };
}

/**
 * The hidden WebView of the engine on the phone (TASK-214): mounted while
 * `engine` wants it, out of sight and of touches. It lives once, in App.
 */
export function PhoneEngineView({ engine = phoneEngine }: { engine?: PhoneEngine }) {
  const mount = useSyncExternalStore(
    (listener) => engine.subscribe(listener),
    () => engine.mountKey,
  );
  const [files, setFiles] = useState<Files | null>(null);
  const webView = useRef<WebView>(null);

  useEffect(() => {
    if (mount < 0 || files !== null) {
      return;
    }
    let live = true;
    prepare().then(
      (ready) => live && setFiles(ready),
      (error: unknown) => live && engine.unavailable(String(error)),
    );
    return () => {
      live = false;
    };
  }, [mount, files, engine]);

  if (mount < 0 || files === null) {
    return null;
  }
  return (
    <WebView
      key={mount}
      ref={webView}
      testID="phone-engine"
      // The WebView's own container grows (flex 1): kept out of the layout too.
      containerStyle={styles.hidden}
      style={styles.hidden}
      pointerEvents="none"
      source={{ uri: files.page }}
      originWhitelist={["file://*"]}
      allowingReadAccessToURL={files.readAccess}
      allowFileAccess
      allowFileAccessFromFileURLs
      javaScriptEnabled
      onLoadEnd={() =>
        engine.attach({
          send: (javascript) => webView.current?.injectJavaScript(javascript),
          pyodide: files.pyodide,
          engine: files.engine,
        })
      }
      onMessage={(event) => engine.receive(event.nativeEvent.data)}
      onContentProcessDidTerminate={() => engine.died()}
      onRenderProcessGone={() => engine.died()}
    />
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    left: -10,
    top: -10,
  },
});
