import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { type ReactNode, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { t, tLater } from "../i18n";
import { fontWeight, type Palette, qrCode as qrColors } from "../theme/tokens";
import type { FlightTask } from "./flightTask";
import { qrCodeOf } from "./qrCode";
import { QrView } from "./QrView";
import type { LoadedTask } from "./waypointStore";
import { XCTSK_MIME, xctskOf } from "./xctskFile";
import { xctskQrOf } from "./xctskQr";

/**
 * The pilot's task passed on (TASK-479 part D4, ADR-0388): as an `.xctsk`
 * file through the share sheet, or as XCTrack's QR code on the screen, for
 * another pilot's phone to read. The task's own words, nothing added.
 */

export const SHARE_FILE = tLater("Share file");
export const SHOW_QR = tLater("Show QR");
export const QR_TITLE = tLater("Task for XCTrack");
export const QR_TOO_LONG = tLater("This task is too long for a QR code.");

type Chip = (key: string, label: string, on: boolean, onPress: () => void) => ReactNode;

/** The file's name: the loaded file's, ending in `.xctsk`. */
export function xctskName(fileName: string): string {
  const base = fileName.replace(/\.[^.]*$/, "").trim();
  return `${base === "" ? "task" : base}.xctsk`;
}

/** Writes the task in the app's cache and opens the share sheet. */
export async function shareTask(
  task: FlightTask,
  fileName: string,
): Promise<"shared" | "no_sharing"> {
  if (!(await Sharing.isAvailableAsync())) {
    return "no_sharing";
  }
  const file = new File(Paths.cache, xctskName(fileName));
  file.create({ overwrite: true });
  file.write(xctskOf(task));
  await Sharing.shareAsync(file.uri, {
    mimeType: XCTSK_MIME,
    dialogTitle: t(SHARE_FILE),
  });
  return "shared";
}

/** The task's QR code: error correction M, L when M does not fit. */
export function taskQr(task: FlightTask) {
  const text = xctskQrOf(task);
  return qrCodeOf(text, "M") ?? qrCodeOf(text, "L");
}

export function TaskShare({
  loaded,
  chip,
  palette,
}: {
  loaded: LoadedTask;
  chip: Chip;
  palette: Palette;
}) {
  const [open, setOpen] = useState(false);
  const { width } = useWindowDimensions();
  const code = open ? taskQr(loaded.task) : null;
  const side = Math.min(width - 48, 360);
  return (
    <>
      <View style={styles.chips}>
        {chip("share-task", t(SHARE_FILE), false, () => {
          void shareTask(loaded.task, loaded.fileName).catch(() => {});
        })}
        {chip("show-qr", t(SHOW_QR), false, () => setOpen(true))}
      </View>
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={[styles.dim, { backgroundColor: palette.scrim }]}
            onPress={() => setOpen(false)}
            accessibilityLabel={t("Close")}
          />
          <View
            style={[styles.sheet, { backgroundColor: palette.surface }]}
            testID="task-qr"
          >
            <Text style={[styles.title, { color: palette.text }]}>{t(QR_TITLE)}</Text>
            {code === null ? (
              <Text style={{ color: palette.text }}>{t(QR_TOO_LONG)}</Text>
            ) : (
              <View style={styles.code}>
                <QrView
                  code={code}
                  size={side}
                  dark={qrColors.dark}
                  light={qrColors.light}
                />
              </View>
            )}
            <Text style={{ color: palette.textMuted }}>{loaded.fileName}</Text>
            <Pressable
              style={[styles.button, { backgroundColor: palette.accent }]}
              onPress={() => setOpen(false)}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, { color: palette.onAccent }]}>
                {t("Close")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  dim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, opacity: 0.6 },
  sheet: {
    gap: 16,
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: { fontSize: 20, fontWeight: fontWeight.bold },
  code: { alignItems: "center" },
  button: {
    minHeight: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 17, fontWeight: fontWeight.semibold },
});
