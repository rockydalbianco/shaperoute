import { type ReactNode, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import type { ImageSource } from "../route/pickImage";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import {
  MY_IMAGE,
  myImageUri,
  pickMyImage,
  removeMyImage,
  useMyImageStamp,
} from "./myImage";
import { MyImageChoices } from "./MyImageChoices";
import type { Actor } from "./videoActor";
import {
  CHARACTERS,
  characterEmoji,
  characterName,
} from "./videoCharacter";

type Props = {
  /** The animal that runs the line in the video, or the runner's own
   * image (TASK-417); null for none. */
  character: Actor | null;
  onChange: (character: Actor | null) => void;
};

/**
 * «Character» in «Share your run» (TASK-408, ADR-0339): «No animal», the
 * runner's own image (TASK-417, ADR-0345), then the animals, one of them
 * chosen, in a row that scrolls sideways. «No animal» is chosen when the
 * post opens: the video is the one of before.
 *
 * «My image» with no image, or chosen already, opens its choices under the
 * row; with an image not chosen, it chooses it.
 */
export function CharacterRow({ character, onChange }: Props) {
  const stamp = useMyImageStamp();
  // Read again whenever the image changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const uri = useMemo(() => myImageUri(), [stamp]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const imageOn = character === MY_IMAGE && uri !== null;

  function pressImage() {
    if (uri !== null && !imageOn) {
      onChange(MY_IMAGE);
      return;
    }
    setProblem(null);
    setOpen(!open);
  }

  async function choose(source: ImageSource) {
    setBusy(true);
    setProblem(null);
    const picked = await pickMyImage(source);
    setBusy(false);
    switch (picked.kind) {
      case "picked":
        onChange(MY_IMAGE);
        setOpen(false);
        break;
      case "denied":
        setProblem(
          t(
            "The camera is off for this app. Allow it in Settings, or choose a picture instead.",
          ),
        );
        break;
      case "unreadable":
        setProblem(t("This image can't be read. The video goes out without it."));
        break;
      case "cancelled":
        break;
    }
  }

  function remove() {
    removeMyImage();
    if (character === MY_IMAGE) {
      onChange(null);
    }
    setOpen(false);
  }

  const tile = (
    key: string,
    on: boolean,
    name: string,
    face: ReactNode,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      style={[styles.tile, on && styles.tileOn]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={name}
      accessibilityState={{ checked: on }}
      testID={`character-${key}`}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {face}
      </View>
      <Text style={[styles.name, on && styles.nameOn]} numberOfLines={2}>
        {name}
      </Text>
    </Pressable>
  );

  const imageFace =
    uri === null ? (
      <Text style={styles.emoji}>+</Text>
    ) : (
      <Image
        key={stamp}
        source={{ uri, cache: "reload" }}
        style={styles.image}
        testID="my-image-thumb"
      />
    );

  return (
    <>
      <Text style={styles.label}>{t("Character")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="radiogroup"
      >
        {tile(
          "none",
          character === null,
          t("No animal"),
          <Text style={styles.emoji}>—</Text>,
          () => onChange(null),
        )}
        {tile(MY_IMAGE, imageOn, t("My image"), imageFace, pressImage)}
        {CHARACTERS.map((choice) =>
          tile(
            choice,
            choice === character,
            characterName(choice),
            <Text style={styles.emoji}>{characterEmoji(choice)}</Text>,
            () => onChange(choice),
          ),
        )}
      </ScrollView>
      {open && (
        <MyImageChoices
          hasImage={uri !== null}
          busy={busy}
          problem={problem}
          onChoose={(source) => void choose(source)}
          onRemove={remove}
        />
      )}
    </>
  );
}

// As the chips of «Music», as tiles.
const styles = StyleSheet.create({
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  row: {
    gap: space.sm,
  },
  tile: {
    width: MIN_TAP_SIZE * 1.6,
    minHeight: MIN_TAP_SIZE * 1.6,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    paddingHorizontal: space.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  tileOn: {
    borderColor: color.text,
    backgroundColor: color.surfaceRaised,
  },
  emoji: {
    fontSize: fontSize.title,
    color: color.text,
  },
  // The image as the video draws it: round.
  image: {
    width: fontSize.title * 1.4,
    height: fontSize.title * 1.4,
    borderRadius: fontSize.title * 0.7,
  },
  name: {
    color: color.textMuted,
    fontSize: fontSize.small,
    textAlign: "center",
  },
  nameOn: {
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
});
