import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import type { ImageSource } from "../route/pickImage";
import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";

type Props = {
  /** An image is kept on this phone: it can be taken off. */
  hasImage: boolean;
  /** A photo is being chosen or made: the buttons wait. */
  busy: boolean;
  /** What went wrong with the last one, in words; null for nothing. */
  problem: string | null;
  onChoose: (source: ImageSource) => void;
  onRemove: () => void;
};

/**
 * The ways to the runner's own image (TASK-417, ADR-0345), under the row
 * «Character» of «Edit video»: a photo or a GIF from the library, a photo
 * taken now, or none when there is one; and the line that says where the
 * image stays. Under the row, as the profile picture's choices are, not in
 * a sheet over the sheet: the phone's own picker opens over it.
 */
export function MyImageChoices({ hasImage, busy, problem, onChoose, onRemove }: Props) {
  return (
    <View style={styles.choices} testID="my-image-choices">
      <Choice
        text={t("Choose a photo")}
        busy={busy}
        onPress={() => onChoose("library")}
      />
      <Choice text={t("Take a photo")} busy={busy} onPress={() => onChoose("camera")} />
      {hasImage && <Choice text={t("Remove image")} busy={busy} onPress={onRemove} />}
      {busy && <ActivityIndicator color={color.textMuted} />}
      {problem !== null && (
        <Text style={styles.problem} accessibilityLiveRegion="polite">
          {problem}
        </Text>
      )}
      <Text style={styles.note}>
        {t("Your image stays on this phone. It leaves only in the video you share.")}
      </Text>
    </View>
  );
}

function Choice({
  text,
  busy,
  onPress,
}: {
  text: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Tap
      style={[styles.button, busy && styles.waiting]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
    >
      <Text style={styles.buttonText}>{text}</Text>
    </Tap>
  );
}

// As the profile picture's choices (src/profile/PhotoChoices.tsx).
const styles = StyleSheet.create({
  choices: {
    gap: space.sm,
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
  waiting: {
    opacity: 0.5,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
