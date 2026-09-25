import type { LatLon } from "@shaperoute/shared-types";
import { useEffect, useRef, useState } from "react";
import { Linking, type StyleProp, type ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

import { buildMapPage, isExternalUrl } from "./mapPage";
import {
  clearRoute,
  follow,
  pageScript,
  parsePageMessage,
  setPosition,
  showRoute,
} from "./messages";

const MAP_PAGE = buildMapPage();

type Props = {
  /** Where the route will start; the map centres on it with a marker. */
  start: LatLon | null;
  /** The route to draw over the roads, or null for none. */
  route: LatLon[] | null;
  /** While navigating, the phone's position: the map follows it (TASK-049). */
  following?: LatLon | null;
  /** Called when the map cannot be shown, with a reason for the log. */
  onError: (reason: string) => void;
  style?: StyleProp<ViewStyle>;
};

export function MapView({ start, route, following = null, onError, style }: Props) {
  const webView = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const routeShown = useRef(false);
  const followed = useRef(false);

  // A new start, even at the same place, centres the map on it again.
  useEffect(() => {
    if (ready && start) {
      webView.current?.injectJavaScript(pageScript(setPosition(start)));
    }
  }, [ready, start]);

  // After the start, so the map frames the route rather than the start.
  useEffect(() => {
    if (!ready) {
      return;
    }
    if (route) {
      webView.current?.injectJavaScript(pageScript(showRoute(route, start)));
      routeShown.current = true;
    } else if (routeShown.current) {
      webView.current?.injectJavaScript(pageScript(clearRoute()));
      routeShown.current = false;
    }
  }, [ready, route, start]);

  // Navigating: the map stays on the runner. After, the whole route again.
  useEffect(() => {
    if (!ready) {
      return;
    }
    if (following) {
      webView.current?.injectJavaScript(pageScript(follow(following)));
      followed.current = true;
    } else if (followed.current) {
      followed.current = false;
      if (route) {
        webView.current?.injectJavaScript(pageScript(showRoute(route, start)));
      }
    }
    // Only a new position moves the map; the route effect above draws it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, following]);

  return (
    <WebView
      ref={webView}
      testID="map"
      style={style}
      source={{ html: MAP_PAGE }}
      originWhitelist={["*"]}
      onLoadStart={() => setReady(false)}
      onMessage={(event) => {
        const message = parsePageMessage(event.nativeEvent.data);
        if (message?.type === "ready") {
          setReady(true);
        } else if (message?.type === "error") {
          onError(message.message);
        }
      }}
      onError={(event) => onError(event.nativeEvent.description)}
      onShouldStartLoadWithRequest={(request) => {
        if (isExternalUrl(request.url)) {
          void Linking.openURL(request.url);
          return false;
        }
        return true;
      }}
      onOpenWindow={(event) => {
        if (isExternalUrl(event.nativeEvent.targetUrl)) {
          void Linking.openURL(event.nativeEvent.targetUrl);
        }
      }}
      // iOS may stop the page to free memory: without a reload it stays white.
      onContentProcessDidTerminate={() => webView.current?.reload()}
    />
  );
}
