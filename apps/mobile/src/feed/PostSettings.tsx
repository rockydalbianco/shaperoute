import type { Visibility } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  descriptionOf,
  type DrawingChoice,
  drawingProblem,
  fetchMyDrawings,
  titleOf,
} from "../api/drawings";
import { SleepPostSwitch } from "../health/SleepPostSwitch";
import { t } from "../i18n";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { useFollowsDoor } from "../social/followsDoor";
import {
  DrawingDescription,
  DrawingTitle,
  VisibilityChips,
} from "../social/PublicParts";
import { color, font, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import type { ShownPost } from "./feedPosts";

type Props = {
  post: ShownPost;
  /** Kept, now or with the next network: the page shows the new words. */
  onSaved: (choice: DrawingChoice) => void;
};

type Shown =
  | { kind: "loading" }
  | { kind: "ready"; key: string; choice: DrawingChoice }
  | { kind: "failed"; problem: string };

/**
 * The settings of one's own post, in its sheet (TASK-410, ADR-0340): who
 * sees it, its title and its description, kept as «My activities» keeps
 * them (`DrawingsDoor.choose`, by the run's key). The run is found among the
 * account's drawings by the drawing's id. «Show heart rate» comes with the
 * heart (TASK-345 B): before it there is nothing to hide. «Sleep last
 * night» is a switch of its own, kept at once (TASK-467, `SleepPostSwitch`).
 */
export function PostSettings({ post, onSaved }: Props) {
  const { apiUrl, account } = useFollowsDoor();
  const { choiceOf, choose } = useDrawingsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [shown, setShown] = useState<Shown>({ kind: "loading" });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("everyone");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const id = post.drawing.id;

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    (async () => {
      const outcome = await fetchMyDrawings(apiUrl, token);
      const key =
        outcome.kind === "ok"
          ? (outcome.value.find((drawing) => drawing.id === id)?.key ?? null)
          : null;
      const known = key === null ? null : await choiceOf(key);
      if (!live) {
        return;
      }
      if (key !== null && known !== null && known.kind === "known") {
        setShown({ kind: "ready", key, choice: known.choice });
        setTitle(known.choice.title ?? "");
        setDescription(known.choice.description ?? "");
        setVisibility(known.choice.visibility);
      } else {
        const why =
          known !== null && known.kind === "failed"
            ? known.problem
            : outcome.kind === "ok"
              ? null
              : drawingProblem(outcome);
        setShown({
          kind: "failed",
          problem: why ?? t("Something went wrong on our side. Try again in a moment."),
        });
      }
    })();
    return () => {
      live = false;
    };
  }, [apiUrl, token, id, choiceOf]);

  if (shown.kind === "loading") {
    return <ActivityIndicator color={color.textMuted} testID="post-settings-loading" />;
  }
  if (shown.kind === "failed") {
    return (
      <Text style={styles.problem} accessibilityRole="alert">
        {shown.problem}
      </Text>
    );
  }
  const edited: DrawingChoice = {
    ...shown.choice,
    title: titleOf(title),
    description: descriptionOf(description),
    visibility,
  };
  const changed =
    edited.title !== shown.choice.title ||
    edited.description !== shown.choice.description ||
    edited.visibility !== shown.choice.visibility;

  async function onSave() {
    if (shown.kind !== "ready") {
      return;
    }
    setSaving(true);
    setProblem(null);
    const chosen = await choose(shown.key, edited);
    setSaving(false);
    if (chosen === null) {
      return;
    }
    if (chosen.kind === "failed") {
      setProblem(chosen.problem);
      return;
    }
    setShown({ kind: "ready", key: shown.key, choice: edited });
    onSaved(edited);
  }

  return (
    <View style={styles.form}>
      <VisibilityChips value={visibility} onChange={setVisibility} disabled={saving} />
      <DrawingTitle value={title} onChange={setTitle} editable={!saving} />
      <DrawingDescription
        value={description}
        onChange={setDescription}
        editable={!saving}
      />
      <SleepPostSwitch drawingId={id} runKey={shown.key} />
      {problem !== null && (
        <Text style={styles.problem} accessibilityRole="alert">
          {problem}
        </Text>
      )}
      <Tap
        style={[styles.save, !changed && styles.saveOff]}
        onPress={onSave}
        disabled={!changed || saving}
        accessibilityRole="button"
        accessibilityState={{ disabled: !changed || saving }}
        testID="post-settings-save"
      >
        <Text style={styles.saveText}>{t("Save")}</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: space.md,
  },
  problem: {
    ...font.small,
    color: color.error,
  },
  save: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: color.accent,
  },
  saveOff: {
    opacity: 0.4,
  },
  saveText: {
    ...font.body,
    color: color.onAccent,
    fontWeight: fontWeight.semibold,
  },
});
