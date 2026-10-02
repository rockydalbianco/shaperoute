import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Avatar } from "./Avatar";
import { useProfilePhoto } from "./useProfilePhoto";

const PHOTO_SIZE = MIN_TAP_SIZE - space.xs;

const BUSY_TEXT = { picking: null, saving: "Saving…", removing: "Removing…" };

/**
 * «Profile picture» in «Settings» (TASK-178, ADR-0146): the picture, or the
 * letter, at the end of the row. A tap opens the ways to change it under
 * the row, as «Delete account» opens its question: a picture from the
 * library, a photo taken now, or none.
 */
export function PhotoRow({ name }: { name: string }) {
  const photo = useProfilePhoto();
  const [open, setOpen] = useState(false);
  const busy = photo.busy !== null;
  const busyText = photo.busy === null ? null : BUSY_TEXT[photo.busy];
  const close = (then: () => void) => () => {
    setOpen(false);
    then();
  };
  return (
    <View style={styles.menu}>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        onPress={() => {
          photo.clearProblem();
          setOpen(!open);
        }}
        disabled={busy}
        accessibilityRole="button"
        // One name for the row: the emoji and the picture are not read.
        accessibilityLabel={
          busyText !== null ? `Profile picture, ${busyText}` : "Profile picture"
        }
        accessibilityState={{ expanded: open, disabled: busy, busy }}
      >
        <Text style={styles.emoji}>📷</Text>
        <Text style={styles.rowText}>Profile picture</Text>
        {busyText !== null && <Text style={styles.busyText}>{busyText}</Text>}
        <Avatar name={name} size={PHOTO_SIZE} photo={photo.uri} />
      </Pressable>
      {open && (
        <View style={styles.choices}>
          <Choice
            text="Choose a picture"
            onPress={close(() => photo.choose("library"))}
          />
          <Choice text="Take a photo" onPress={close(() => photo.choose("camera"))} />
          {photo.uri !== null && (
            <Choice text="Remove picture" onPress={close(photo.remove)} />
          )}
        </View>
      )}
      {photo.problem !== null && <Text style={styles.problem}>{photo.problem}</Text>}
    </View>
  );
}

function Choice({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress} accessibilityRole="button">
      <Text style={styles.buttonText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // As the other rows of «Settings» (SettingsPage.tsx).
  menu: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  row: {
    minHeight: MIN_TAP_SIZE + space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  emoji: {
    fontSize: fontSize.input + space.xs,
  },
  rowText: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
  },
  busyText: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  choices: {
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
  },
  // Neutral: the yellow belongs to the route (docs/UI.md, «Il tema»).
  button: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
  },
});
