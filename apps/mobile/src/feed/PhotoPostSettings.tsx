import type { DrawingTag, MyPhotoPost } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { fetchMyPhotoPosts, type PhotoPostChoice } from "../api/photoPosts";
import { t } from "../i18n";
import { VisibilityChoice } from "../imports/PhotoPostForm";
import { useFollowsDoor } from "../social/followsDoor";
import { waitingPost } from "../social/photoPostOutbox";
import {
  DrawingDescription,
  DrawingTitle,
  PublicLine,
  seenText,
  TagsField,
} from "../social/PublicParts";
import { usePhotoPostOutbox } from "../social/usePhotoPostOutbox";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import type { ShownPost } from "./feedPosts";

/** What the owner changed, shown at once on the page. */
export type PhotoPostEdit = { title: string | null; description: string | null };

type Props = {
  post: ShownPost;
  onSaved: (edit: PhotoPostEdit) => void;
  /** Deleted: the page closes. */
  onDeleted: () => void;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

type Found =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "found"; key: string; tags: DrawingTag[] };

/**
 * The settings of one's own post of photos only, under the bar of its page
 * (TASK-312 part C2): its title, «How did it go?», the people tagged and
 * «Everyone» or «Followers», kept with «Save»; and «Delete», after a yes.
 * The post is found by its id among the account's (GET /me/photo-posts),
 * for its key, so one posted from another phone is changed too. Both go
 * through the phone's file, and to the API when there is a network.
 */
export function PhotoPostSettings({
  post,
  onSaved,
  onDeleted,
  fetchFn,
  apiKey,
}: Props) {
  const { apiUrl, account } = useFollowsDoor();
  const { save, remove, owner } = usePhotoPostOutbox(fetchFn);
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const { drawing } = post;
  const reachable = apiUrl !== null && token !== null;
  const [found, setFound] = useState<Found>(
    reachable ? { kind: "loading" } : { kind: "failed" },
  );
  const [title, setTitle] = useState(drawing.title ?? "");
  const [description, setDescription] = useState(drawing.description ?? "");
  const [visibility, setVisibility] = useState(
    drawing.visibility === "followers" ? ("followers" as const) : ("everyone" as const),
  );
  const [tags, setTags] = useState<DrawingTag[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchMyPhotoPosts(apiUrl, token, { fetchFn }).then((outcome) => {
      if (!live) {
        return;
      }
      const mine: MyPhotoPost | undefined =
        outcome.kind === "ok"
          ? outcome.value.find((one) => one.id === drawing.id)
          : undefined;
      if (mine === undefined) {
        setFound({ kind: "failed" });
        return;
      }
      // A change still on the phone is the one to start from.
      const waiting = owner === null ? null : waitingPost(owner, mine.key);
      setFound({ kind: "found", key: mine.key, tags: mine.tags });
      setTags(mine.tags);
      if (waiting !== null) {
        setTitle(waiting.choice.title ?? "");
        setDescription(waiting.choice.description ?? "");
        setVisibility(waiting.choice.visibility);
      }
    });
    return () => {
      live = false;
    };
  }, [apiUrl, token, drawing.id, owner, fetchFn]);

  if (found.kind === "loading") {
    return (
      <ActivityIndicator color={color.textMuted} testID="photo-post-settings-loading" />
    );
  }
  if (found.kind === "failed") {
    return <PublicLine text={t("Something went wrong.")} alert />;
  }
  const { key } = found;

  function keep() {
    const choice: PhotoPostChoice = {
      title: title.trim() === "" ? null : title.trim(),
      description: description.trim() === "" ? null : description.trim(),
      visibility,
      tags: tags.map((tag) => tag.public_id),
    };
    const saved = save({ key, choice, added: [], removed: [], order: null });
    if (saved !== "kept") {
      setProblem(t("Something went wrong."));
      return;
    }
    setProblem(null);
    onSaved({ title: choice.title, description: choice.description });
  }

  function deleted() {
    if (remove(key) !== "kept") {
      setProblem(t("Something went wrong."));
      return;
    }
    onDeleted();
  }

  const seen = seenText(visibility);
  return (
    <View style={styles.settings} testID="photo-post-settings">
      <DrawingTitle value={title} onChange={setTitle} />
      <DrawingDescription value={description} onChange={setDescription} />
      <TagsField tags={tags} onChange={setTags} fetchFn={fetchFn} apiKey={apiKey} />
      <VisibilityChoice value={visibility} onChange={setVisibility} />
      {seen !== null && <PublicLine text={seen} />}
      {problem !== null && <PublicLine text={problem} alert />}
      <Pressable
        style={styles.button}
        onPress={keep}
        accessibilityRole="button"
        testID="photo-post-save"
      >
        <Text style={styles.buttonText}>{t("Save")}</Text>
      </Pressable>
      {confirming ? (
        <View style={styles.confirm}>
          <Text style={styles.question}>
            {t("Delete this post? It cannot be undone.")}
          </Text>
          <View style={styles.buttons}>
            <Pressable
              style={styles.button}
              onPress={() => setConfirming(false)}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{t("Cancel")}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.danger]}
              onPress={deleted}
              accessibilityRole="button"
              testID="photo-post-delete-yes"
            >
              <Text style={[styles.buttonText, styles.dangerText]}>
                {t("Delete post")}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.button}
          onPress={() => setConfirming(true)}
          accessibilityRole="button"
          testID="photo-post-delete"
        >
          <Text style={[styles.buttonText, styles.dangerText]}>{t("Delete")}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  settings: {
    gap: space.sm,
  },
  confirm: {
    gap: space.sm,
  },
  question: {
    color: color.text,
    fontSize: fontSize.body,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  // Neutral, as every button of the post's settings: the yellow is the
  // route's (docs/UI.md, «Il tema»).
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  danger: {
    borderColor: color.error,
  },
  dangerText: {
    color: color.error,
  },
});
