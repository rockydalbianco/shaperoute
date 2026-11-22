import type { LatLon } from "@shaperoute/shared-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { buildGroundPage, parseGroundMessage } from "./groundPage";
import { askAgain, setGround } from "./groundStore";

/**
 * The page that reads the ground's height (TASK-479 part A1), out of sight
 * while the flight screen is open: asked again at most every 2 s, once the
 * pilot has moved 40 m. What it answers goes to `groundStore`, which
 * «Height above ground» reads at the next tick.
 */
export function GroundProbe({ here, nowMs }: { here: LatLon | null; nowMs: number }) {
  const page = useMemo(() => buildGroundPage(), []);
  const view = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const asked = useRef<{ point: LatLon; atMs: number; id: number } | null>(null);
  const lastId = useRef(0);
  useEffect(() => {
    if (!ready || here === null || !askAgain(here, nowMs, asked.current)) {
      return;
    }
    lastId.current += 1;
    asked.current = { point: here, atMs: nowMs, id: lastId.current };
    view.current?.injectJavaScript(
      `window.ground(${lastId.current}, ${here[0]}, ${here[1]}); true;`,
    );
  }, [ready, here, nowMs]);
  return (
    <View style={styles.hidden} pointerEvents="none" testID="ground-probe">
      <WebView
        ref={view}
        source={{ html: page }}
        originWhitelist={["*"]}
        onLoadStart={() => setReady(false)}
        onMessage={(event) => {
          const message = parseGroundMessage(event.nativeEvent.data);
          if (message?.type === "ready") {
            asked.current = null;
            setReady(true);
          } else if (
            message?.type === "ground" &&
            message.altM !== null &&
            asked.current !== null &&
            message.id === asked.current.id
          ) {
            setGround({
              point: asked.current.point,
              altM: message.altM,
              atMs: asked.current.atMs,
            });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
});
