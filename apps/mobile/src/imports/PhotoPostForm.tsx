import {
  type DrawingTag,
  PHOTO_POST_MAX_PHOTOS,
  PHOTO_POST_VISIBILITIES,
  type PhotoPostVisibility,
} from "@shaperoute/shared-types";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { gymKey } from "../gym/gymKey";
import { t } from "../i18n";
import { phonePhotoUri } from "../social/drawingPhotos";
import { type ComposerPhoto, PostComposer } from "../social/composer/PostComposer";
import { orderOf, type PostItem } from "../social/composer/postOrder";
import {
  DrawingDescription,
  DrawingTitle,
  nextPlace,
  oneAtATime,
  type PickPhoto,
  PublicLine,
  seenText,
  TagsField,
} from "../social/PublicParts";
import { type PhotoPostSaved, usePhotoPostOutbox } from "../social/usePhotoPostOutbox";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { ImportedMark } from "./ImportedMark";
import { keepVisibility, startVisibility } from "./photoPostVisibility";

/** A photo chosen, on the phone until the post goes. */
type PhonePhoto = { n: number; base64: string };

type Props = {
  /** «Post» kept it on the phone; it goes to the API now or later. */
  onPosted: () => void;
  onCancel: () => void;
  /** The fakes of the tests. */
  pick?: PickPhoto;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
  /** The key of the new post; made from the clock, else. */
  makeKey?: () => string;
};

export function visibilityName(visibility: PhotoPostVisibility): string {
  return visibility === "everyone" ? t("Everyone") : t("Followers");
}

/** Words for a post that could not be kept on the phone. */
function keptProblem(saved: PhotoPostSaved): string | null {
  return saved === "kept" ? null : t("Something went wrong.");
}

/**
 * «Photos only» (TASK-312 part C, docs/IMPORTAZIONI.md §4): a post of
 * photos taken elsewhere, from Instagram too, without a run: the form of a
 * post without the map and without the numbers. Up to 10 photos, at least
 * one, in the order chosen; the title, «How did it go?», the people tagged
 * and «Everyone» or «Followers», never «Only me». Marked «Imported»: it
 * counts for neither Play nor the contests. «Post» keeps it on the phone,
 * and it goes when there is a network (usePhotoPostOutbox).
 */
export function PhotoPostForm({
  onPosted,
  onCancel,
  pick,
  fetchFn,
  apiKey,
  makeKey = () => gymKey(Date.now()),
}: Props) {
  const { save, owner } = usePhotoPostOutbox(fetchFn);
  const [photos, setPhotos] = useState<PhonePhoto[]>([]);
  const [items, setItems] = useState<PostItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<DrawingTag[]>([]);
  const [visibility, setVisibility] = useState<PhotoPostVisibility>(() =>
    startVisibility(owner),
  );
  const [problem, setProblem] = useState<string | null>(null);
  const shown: ComposerPhoto[] = photos.map((photo) => ({
    n: photo.n,
    source: { uri: phonePhotoUri(photo.base64) },
    layout: null,
    original: null,
  }));

  function post() {
    if (photos.length === 0) {
      setProblem(t("Add at least one photo."));
      return;
    }
    const saved = save({
      key: makeKey(),
      choice: {
        title: title.trim() === "" ? null : title.trim(),
        description: description.trim() === "" ? null : description.trim(),
        visibility,
        tags: tags.map((tag) => tag.public_id),
      },
      added: photos,
      removed: [],
      order: orderOf(items),
    });
    const failed = keptProblem(saved);
    if (failed !== null) {
      setProblem(failed);
      return;
    }
    if (owner !== null) {
      keepVisibility(owner, visibility);
    }
    onPosted();
  }

  const seen = seenText(visibility);
  return (
    <View style={styles.form} testID="photo-post-form">
      <ImportedMark />
      <PostComposer
        items={items}
        photos={shown}
        onOrder={setItems}
        onAdd={(added) => {
          const nextPhotos = [...photos];
          const nextItems = [...items];
          for (const base64 of added) {
            const n = nextPlace(nextPhotos, PHOTO_POST_MAX_PHOTOS);
            if (n === null) {
              break;
            }
            nextPhotos.push({ n, base64 });
            nextItems.push({ kind: "photo", n });
          }
          setPhotos(nextPhotos);
          setItems(nextItems);
          setProblem(null);
        }}
        onRemove={(n) => {
          setPhotos(photos.filter((photo) => photo.n !== n));
          setItems(items.filter((item) => item.kind === "drawing" || item.n !== n));
        }}
        track={null}
        pick={pick === undefined ? undefined : oneAtATime(pick)}
      />
      <DrawingTitle value={title} onChange={setTitle} />
      <DrawingDescription value={description} onChange={setDescription} />
      <TagsField tags={tags} onChange={setTags} fetchFn={fetchFn} apiKey={apiKey} />
      <VisibilityChoice value={visibility} onChange={setVisibility} />
      {seen !== null && <PublicLine text={seen} />}
      {problem !== null && <PublicLine text={problem} alert />}
      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={onCancel} accessibilityRole="button">
          <Text style={styles.buttonText}>{t("Cancel")}</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={post}
          accessibilityRole="button"
          testID="photo-post-post"
        >
          <Text style={styles.buttonText}>{t("Post")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** «Who can see it» of a post of photos only: everyone or the followers. */
export function VisibilityChoice({
  value,
  onChange,
  disabled,
}: {
  value: PhotoPostVisibility;
  onChange: (visibility: PhotoPostVisibility) => void;
  disabled?: boolean;
}) {
  const label = t("Who can see it");
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={styles.chips}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
        {PHOTO_POST_VISIBILITIES.map((id) => {
          const on = id === value;
          return (
            <Pressable
              key={id}
              style={[styles.chip, on && styles.chipOn, disabled && styles.busy]}
              onPress={() => onChange(id)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {visibilityName(id)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: space.sm,
  },
  field: {
    gap: space.xs,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs,
  },
  chip: {
    minHeight: MIN_TAP_SIZE - space.sm,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  // The chosen one, as a switch on: a stronger border, not the yellow.
  chipOn: {
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  chipText: {
    color: color.textMuted,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  chipTextOn: {
    color: color.text,
  },
  busy: {
    opacity: 0.6,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  // Neutral, as every button of the end of a run: the yellow is the
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
});
