import { FLYING_SITES_MAX_BOX_DEG, type FlyingSite } from "@shaperoute/shared-types";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { type Box, flyingSitesIn } from "../api/flyingSites";
import { t } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { TakeoffSheet } from "./TakeoffSheet";
import {
  buildTakeoffsMapPage,
  PLACE_ZOOM,
  parseTakeoffsMapMessage,
  sitesCollection,
} from "./takeoffsMapPage";

/**
 * The map of takeoffs (TASK-493 part C, ADR-0400), over the whole screen:
 * the takeoffs and landings of OpenStreetMap in the box the map shows,
 * asked again each time it stops; a tap opens the site's card
 * (TakeoffSheet). Wider than the server reads, it asks to zoom in. It
 * starts where the phone last was, when the app may already read the
 * place; it never asks for it.
 */

/** Where to add a missing takeoff. */
export const OSM_EDIT_URL = "https://www.openstreetmap.org/";

type Props = {
  visible: boolean;
  onClose: () => void;
  fetchFn?: typeof fetch;
};

export type Notice = "zoom" | "more" | "failed" | null;

/** Too wide a box for the server: the app does not ask it. */
export function tooWide(box: Box): boolean {
  return (
    box.north - box.south > FLYING_SITES_MAX_BOX_DEG ||
    box.east - box.west > FLYING_SITES_MAX_BOX_DEG
  );
}

export function noticeText(notice: Notice): string | null {
  switch (notice) {
    case "zoom":
      return t("Zoom in to see the takeoffs.");
    case "more":
      return t("Zoom in to see all the takeoffs.");
    case "failed":
      return t("The takeoffs could not be loaded.");
    default:
      return null;
  }
}

async function lastPlace(): Promise<[number, number] | null> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) {
      return null;
    }
    const last = await Location.getLastKnownPositionAsync();
    return last === null ? null : [last.coords.latitude, last.coords.longitude];
  } catch {
    return null;
  }
}

export function TakeoffsMap({ visible, onClose, fetchFn }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {visible && <TakeoffsPage onClose={onClose} fetchFn={fetchFn} />}
      </SafeAreaProvider>
    </Modal>
  );
}

function TakeoffsPage({
  onClose,
  fetchFn,
}: {
  onClose: () => void;
  fetchFn?: typeof fetch;
}) {
  const insets = useSafeAreaInsets();
  const language = useLanguage();
  const { apiUrl } = useFollowsDoor();
  const page = useMemo(() => buildTakeoffsMapPage(color, language, null), [language]);
  const view = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const asked = useRef(0);

  const call = (script: string) =>
    view.current?.injectJavaScript(`if (window.takeoffs) { ${script} } true;`);

  // Where the phone last was, once the map can move.
  useEffect(() => {
    if (!ready) {
      return;
    }
    let alive = true;
    void lastPlace().then((place) => {
      if (alive && place !== null) {
        call(`window.takeoffs.center(${place[0]}, ${place[1]}, ${PLACE_ZOOM});`);
      }
    });
    return () => {
      alive = false;
    };
  }, [ready]);

  useEffect(() => {
    if (ready) {
      call(`window.takeoffs.select(${chosen === null ? "null" : chosen});`);
    }
  }, [ready, chosen]);

  async function show(box: Box) {
    if (tooWide(box)) {
      setNotice("zoom");
      call(`window.takeoffs.setSites(${JSON.stringify(sitesCollection([]))});`);
      return;
    }
    if (apiUrl === null) {
      setNotice("failed");
      return;
    }
    // Only the latest box counts, if two overlap.
    const request = ++asked.current;
    const answer = await flyingSitesIn(apiUrl, box, { fetchFn });
    if (request !== asked.current) {
      return;
    }
    if (answer.kind !== "ok") {
      setNotice("failed");
      return;
    }
    const sites: FlyingSite[] = answer.value.sites;
    setNotice(answer.value.more ? "more" : null);
    call(`window.takeoffs.setSites(${JSON.stringify(sitesCollection(sites))});`);
  }

  const text = noticeText(notice);
  return (
    <View style={styles.screen} testID="takeoffs-map">
      <WebView
        ref={view}
        style={styles.map}
        source={{ html: page }}
        originWhitelist={["*"]}
        onMessage={(event) => {
          const message = parseTakeoffsMapMessage(event.nativeEvent.data);
          if (message === null) {
            return;
          }
          if (message.type === "ready") {
            setReady(true);
          } else if (message.type === "box") {
            void show(message);
          } else if (message.type === "site") {
            setChosen(message.id);
          }
        }}
      />
      <View
        style={[styles.top, { paddingTop: insets.top + space.sm }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.close}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("Close")}
          testID="takeoffs-close"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t("Takeoffs")}
        </Text>
      </View>
      {text !== null && (
        <View style={styles.notice} pointerEvents="none" testID="takeoffs-notice">
          <Text style={styles.noticeText}>{text}</Text>
        </View>
      )}
      {chosen !== null && apiUrl !== null ? (
        <View style={[styles.bottom, { paddingBottom: insets.bottom }]}>
          <TakeoffSheet
            siteId={chosen}
            baseUrl={apiUrl}
            onClose={() => {
              setChosen(null);
              onClose();
            }}
            fetchFn={fetchFn}
          />
        </View>
      ) : (
        <Pressable
          style={[styles.missing, { marginBottom: insets.bottom + space.xl }]}
          onPress={() => void Linking.openURL(OSM_EDIT_URL)}
          accessibilityRole="link"
          testID="takeoffs-missing"
        >
          <Text style={styles.missingText}>
            {t("Missing a takeoff? Add it on OpenStreetMap.")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.background,
  },
  map: {
    flex: 1,
    backgroundColor: color.map.background,
  },
  top: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  close: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    borderRadius: MIN_TAP_SIZE / 2,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  title: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
  },
  notice: {
    position: "absolute",
    alignSelf: "center",
    top: "45%",
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  noticeText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  missing: {
    position: "absolute",
    alignSelf: "center",
    bottom: 0,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  missingText: {
    color: color.text,
    fontSize: fontSize.body,
  },
});
