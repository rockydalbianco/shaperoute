import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { SheetModal } from "../ui/SheetModal";
import { CharacterRow } from "./CharacterRow";
import { DescribeVideo } from "./DescribeVideo";
import { EndingRow } from "./EndingRow";
import { LineColourRow } from "./LineColourRow";
import type { PostRun } from "./postRun";
import { ScenesRows } from "./ScenesRows";
import { StyleRow } from "./StyleRow";
import type { VideoEdit } from "./videoEdit";
import { VideoEmojiRow } from "./VideoEmojiRow";
import { VideoPreview } from "./VideoPreview";
import type { VideoScene } from "./videoScene";

type Props = {
  visible: boolean;
  run: PostRun;
  edit: VideoEdit;
  /** Each change at once: the sheet has no «Cancel», only «Done». */
  onChange: (edit: VideoEdit) => void;
  onClose: () => void;
  /** The video of the post with an edit, for the preview (part C2c). */
  sceneOf: (edit: VideoEdit) => VideoScene;
};

/**
 * «Edit video» (TASK-408, ADR-0339, part C1): a sheet from the bottom of
 * «Share your run», with the video's own choices in rows, as the proposal's
 * board draws it: «Describe your video» (part D) and the preview at the
 * top (part C2c), then «Style»,
 * «Character», «Line colour», the emoji
 * «Along the way» and «At the end», then «Scenes» and «Ending» (part C2).
 * Every choice holds at once; «Done»
 * closes the sheet, and «Export video» makes the video as chosen.
 */
export function EditVideoSheet({
  visible,
  run,
  edit,
  onChange,
  onClose,
  sceneOf,
}: Props) {
  return (
    <SheetModal visible={visible} onRequestClose={onClose} dim testID="edit-video">
      <SheetBody
        run={run}
        edit={edit}
        onChange={onChange}
        onClose={onClose}
        sceneOf={sceneOf}
      />
    </SheetModal>
  );
}

function SheetBody({ run, edit, onChange, onClose, sceneOf }: Omit<Props, "visible">) {
  const insets = useSafeAreaInsets();
  const change = (part: Partial<VideoEdit>) => onChange({ ...edit, ...part });
  return (
    <View style={styles.layer}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("Close")}
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.grip} />
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {t("Edit video")}
          </Text>
          <Pressable
            style={styles.done}
            onPress={onClose}
            accessibilityRole="button"
            testID="edit-video-done"
          >
            <Text style={styles.doneText}>{t("Done")}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.rows}>
          <DescribeVideo edit={edit} onChange={onChange} />
          <VideoPreview edit={edit} sceneOf={sceneOf} />
          <StyleRow
            run={run}
            style={edit.style}
            line={edit.line}
            onChange={(style) => change({ style })}
          />
          <CharacterRow
            character={edit.character}
            onChange={(character) => change({ character })}
          />
          <LineColourRow line={edit.line} onChange={(line) => change({ line })} />
          <Text style={styles.label}>{t("Emoji")}</Text>
          <VideoEmojiRow
            title={t("Along the way")}
            emoji={edit.along}
            onChange={(along) => change({ along })}
            testID="along"
          />
          <VideoEmojiRow
            title={t("At the end")}
            emoji={edit.end}
            onChange={(end) => change({ end })}
            testID="end"
          />
          <ScenesRows edit={edit} onChange={change} />
          {!edit.off.includes("ending") && (
            <EndingRow ending={edit.ending} onChange={(ending) => change({ ending })} />
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: "88%",
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.md,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  grip: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.borderStrong,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  done: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingLeft: space.lg,
  },
  doneText: {
    color: color.accent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  rows: {
    gap: space.md,
    paddingBottom: space.sm,
  },
  // As the labels of SharePost.
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
});
