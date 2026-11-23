import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Activity } from "../api/activities";
import { sleepPostsOn, sleepReader } from "../health/sleepModules";
import type { SleepReader } from "../health/sleepSamples";
import { AddPastActivity } from "../imports/AddPastActivity";
import { PhotoPostForm } from "../imports/PhotoPostForm";
import { filePickerAvailable, type PickFile } from "../imports/pickActivityFile";
import type { PickPhoto } from "../social/PublicParts";
import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { SheetModal } from "../ui/SheetModal";
import { useSheetFace } from "../ui/sheetFace";
import { Tap } from "../ui/Tap";
import { type AddToFeedEntryId, addToFeedEntries } from "./addToFeedEntries";
import { PastActivityPost } from "./PastActivityPost";
import { PlanPostFlow } from "./PlanPostFlow";
import { SleepPostPage } from "./SleepPostPage";

type Props = {
  /** «Record now»: the sheet closes and the recording starts (App.tsx);
   * without it the entry is not there. */
  onRecord?: () => void;
  /** A night of sleep went in the Feed, or was taken off it, from «Sleep»:
   * the Feed reads again. */
  onSleepPost?: () => void;
  /** An activity was opened in «Already recorded», and may be a post now:
   * the Feed reads again once the sheet closes. */
  onActivityPosted?: () => void;
  /** The phone's reader of the sleep: none in every build until part C. */
  reader?: SleepReader | null;
  /** The fakes of the tests: whether the app was built with the file
   * picker, the pickers, and the network. */
  available?: boolean;
  pickFile?: PickFile;
  pick?: PickPhoto;
  fetchFn?: typeof fetch;
};

/**
 * The «+» at the right of the Feed's bar (TASK-476): a sheet «Add to Feed»
 * that opens on the list of its ready entries (TASK-481, ADR-0390,
 * addToFeedEntries.ts). «Record now» closes it and starts a recording.
 * «Photos only» (TASK-312 part C) is the form of a post of photos without a
 * run. «From a file» is the flow of «Add past activity» of «My activities»
 * (docs/IMPORTAZIONI.md §2): «Files» opens at once for the GPX, TCX or FIT
 * of another app, read on the phone, then the form of the end of a run,
 * marked «Imported». «Workout plan» (TASK-485 part B, ADR-0394) is
 * «Choose a plan» among one's gym plans, a line and «Post». A chosen entry
 * opens in the same sheet, with «‹» back
 * to the list; the sheet closes once the run or the post is kept, or the
 * form discarded. In an app built without the file picker there is no
 * «From a file». «Sleep» (TASK-467 part E) is last night with «Publish»,
 * a post of its own: there only while the sleep is on (`sleepPostsOn`) and
 * the phone has a reader of it, so in no build until part C. «Already
 * recorded» (TASK-481 part F) lists the activities of «My activities» not
 * in the Feed yet, and opens the form of «Edit post» of the one chosen:
 * «‹» goes back to that list first.
 */
export function AddToFeed({
  onRecord,
  onSleepPost,
  onActivityPosted,
  reader = sleepReader(),
  available = filePickerAvailable(),
  pickFile,
  pick,
  fetchFn,
}: Props) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<AddToFeedEntryId | null>(null);
  // The activity open in «Already recorded»; and whether one was, since
  // the sheet opened.
  const [past, setPast] = useState<Activity | null>(null);
  const [pastOpened, setPastOpened] = useState(false);
  const insets = useSafeAreaInsets();
  // The sheet in the glass look (TASK-469 A7a).
  const glassSheet = useSheetFace();
  const { width } = useWindowDimensions();
  const entries = addToFeedEntries({
    record: onRecord !== undefined,
    filePicker: available,
    sleep: sleepPostsOn() && reader !== null,
  });
  const entry = entries.find(({ id }) => id === chosen) ?? null;
  const close = () => {
    setOpen(false);
    setChosen(null);
    setPast(null);
    setPastOpened(false);
    if (pastOpened) {
      onActivityPosted?.();
    }
  };
  const back = () => {
    if (chosen === "done" && past !== null) {
      setPast(null);
      return;
    }
    setChosen(null);
  };
  const choose = (id: AddToFeedEntryId) => {
    if (id === "record") {
      close();
      onRecord?.();
      return;
    }
    setChosen(id);
  };
  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.plus, pressed && styles.pressed]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("Add to Feed")}
        hitSlop={space.xs}
        testID="feed-add"
      >
        <Text style={styles.plusText}>+</Text>
      </Pressable>
      <SheetModal visible={open} onRequestClose={close} dim testID="feed-add-sheet">
        <Pressable
          style={[styles.backdrop, { minHeight: insets.top + space.xl }]}
          onPress={close}
          accessible={false}
          importantForAccessibility="no"
          testID="feed-add-backdrop"
        />
        <View style={[styles.sheet, glassSheet]}>
          <View style={[styles.head, entry !== null && styles.headWithBack]}>
            {entry !== null && (
              <Pressable
                style={({ pressed }) => [styles.close, pressed && styles.pressed]}
                onPress={back}
                accessibilityRole="button"
                accessibilityLabel={t("Back")}
                testID="feed-add-back"
              >
                <Text style={styles.backText}>‹</Text>
              </Pressable>
            )}
            <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
              {entry?.title ?? t("Add to Feed")}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={t("Close")}
              testID="feed-add-close"
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + space.lg },
            ]}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {entry === null && (
              <View style={styles.list}>
                {entries.map(({ id, title, detail }) => (
                  <Tap
                    key={id}
                    style={styles.entry}
                    onPress={() => choose(id)}
                    accessibilityRole="button"
                    testID={`feed-add-${id}`}
                  >
                    <Text style={styles.entryTitle}>{title}</Text>
                    <Text style={styles.entryDetail}>{detail}</Text>
                  </Tap>
                ))}
              </View>
            )}
            {entry?.id === "done" && (
              <PastActivityPost
                chosen={past}
                onChoose={(activity) => {
                  setPast(activity);
                  setPastOpened(true);
                }}
                onDone={close}
                pick={pick}
                fetchFn={fetchFn}
              />
            )}
            {entry?.id === "photos" && (
              <View style={styles.card}>
                <PhotoPostForm
                  onPosted={close}
                  onCancel={back}
                  pick={pick}
                  fetchFn={fetchFn}
                />
              </View>
            )}
            {entry?.id === "plan" && (
              <View style={styles.card}>
                <PlanPostFlow
                  onDone={close}
                  fetchFn={fetchFn}
                  width={width - 2 * (space.lg + space.md)}
                />
              </View>
            )}
            {entry?.id === "file" && (
              <AddPastActivity
                opened
                fileAtOnce
                onDone={close}
                available={available}
                pickFile={pickFile}
                pick={pick}
                fetchFn={fetchFn}
              />
            )}
            {entry?.id === "sleep" && (
              <View style={styles.card}>
                <SleepPostPage
                  reader={reader}
                  onChanged={onSleepPost}
                  onDone={close}
                  fetchFn={fetchFn}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </SheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  plus: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surface,
  },
  pressed: {
    opacity: 0.6,
  },
  plusText: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.medium,
  },
  backdrop: {
    flexGrow: 1,
  },
  // Up to the top less the status bar: the form of a run is long. The
  // app's sheet: its radius, one physical pixel at the top (TASK-339 D).
  sheet: {
    flexShrink: 1,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.surface,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: space.lg,
    paddingRight: space.sm,
    paddingTop: space.sm,
  },
  title: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold,
  },
  headWithBack: {
    paddingLeft: space.sm,
  },
  backText: {
    color: color.text,
    fontSize: fontSize.title,
  },
  close: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  list: {
    gap: space.sm,
  },
  // As the choices of «Add past activity», which the list took over.
  entry: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    gap: 2,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  entryTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  entryDetail: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  card: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
});
