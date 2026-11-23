import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/** How far a finger may zoom into the photo (iOS). */
const MAX_ZOOM = 4;

/** A photo as the API keeps it: its address and the headers it is read with. */
export type PhotoSource = { uri: string; headers: Record<string, string> };

/** Puts the file at `url` in the phone's cache, at `fileUri`. */
export type Download = (
  url: string,
  fileUri: string,
  headers: Record<string, string>,
) => Promise<void>;

const downloadFile: Download = async (url, fileUri, headers) => {
  await File.downloadFileAsync(url, new File(fileUri), { headers, idempotent: true });
};

async function shareFile(uri: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "image/jpeg",
      UTI: "public.jpeg",
      dialogTitle: t("Save"),
    });
  }
}

/** The name of the photo in the cache: one per post and place. */
export function cachedPhotoName(drawingId: string, n: number): string {
  return `feed-photo-${drawingId.replace(/[^A-Za-z0-9_-]/g, "_")}-${n}.jpg`;
}

type Props = {
  source: PhotoSource;
  /** Which post and which of its photos: the name of its file in the cache. */
  drawingId: string;
  n: number;
  onClose: () => void;
  /** The tests' own. */
  download?: Download;
  share?: (uri: string) => Promise<void>;
};

/**
 * A photo of a post in «Feed» on the whole screen: the whole photo, not
 * cut, to zoom into with two fingers on iOS. «Save» downloads it into the
 * cache and opens the phone's sheet, where «Save Image» keeps it among the
 * phone's photos; «Close» goes back to «Feed».
 */
export function PhotoViewer({
  source,
  drawingId,
  n,
  onClose,
  download = downloadFile,
  share = shareFile,
}: Props) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function saveIt() {
    setSaving(true);
    setProblem(null);
    const uri = `${Paths.cache.uri}${cachedPhotoName(drawingId, n)}`;
    void (async () => {
      try {
        await download(source.uri, uri, source.headers);
      } catch {
        setSaving(false);
        setProblem(t("No connection. Try again when you are online."));
        return;
      }
      try {
        await share(uri);
      } catch {
        // The sheet closed or could not open: nothing to say.
      }
      setSaving(false);
    })();
  }

  return (
    <Modal
      visible
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape"]}
    >
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
        testID="feed-photo-viewer"
      >
        <ScrollView
          style={styles.media}
          contentContainerStyle={styles.mediaContent}
          maximumZoomScale={MAX_ZOOM}
          minimumZoomScale={1}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <Image
            testID="feed-photo-whole"
            style={styles.fill}
            resizeMode="contain"
            source={source}
            accessibilityLabel={t("Photo {n}", { n })}
          />
        </ScrollView>
        {problem !== null && (
          <Text style={styles.problem} accessibilityRole="alert">
            {problem}
          </Text>
        )}
        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              (pressed || saving) && styles.pressed,
            ]}
            onPress={saveIt}
            disabled={saving}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
            testID="feed-photo-save"
          >
            <Text style={styles.buttonText}>{t("Save")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={onClose}
            accessibilityRole="button"
            testID="feed-photo-close"
          >
            <Text style={styles.buttonText}>{t("Close")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Dark whatever the tone: a photo reads best on it.
  screen: {
    flex: 1,
    backgroundColor: color.scrim,
  },
  media: {
    flex: 1,
  },
  mediaContent: {
    flexGrow: 1,
  },
  fill: {
    flex: 1,
    alignSelf: "stretch",
    backgroundColor: color.scrim,
  },
  problem: {
    color: color.onScrim,
    fontSize: fontSize.body,
    textAlign: "center",
    paddingHorizontal: space.lg,
  },
  buttons: {
    flexDirection: "row",
    gap: space.md,
    padding: space.lg,
  },
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.onScrim,
  },
  buttonText: {
    color: color.onScrim,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  pressed: {
    opacity: 0.6,
  },
});
