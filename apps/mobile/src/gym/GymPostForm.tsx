import { type DrawingChoice, NOT_CHOSEN } from "../api/drawings";
import { SwitchRow } from "../contest/EnterSwitch";
import { t } from "../i18n";
import { phonePhotoUri } from "../social/drawingPhotos";
import type { ComposerPhoto } from "../social/composer/PostComposer";
import { DRAWING_ITEM, type PostItem, renumbered } from "../social/composer/postOrder";
import { DrawingForm, nextPlace, type PickPhoto } from "../social/PublicParts";
import { loadVisibility } from "../social/visibilityChoice";
import { GYM_MAX_PHOTOS } from "../sports/gym";

/** A photo chosen at the end of the workout, on the phone until «Save». */
export type GymPhoto = { n: number; base64: string };

/** The post of a workout as the end of it holds it (TASK-385 part D). */
export type GymPost = {
  choice: DrawingChoice;
  photos: GymPhoto[];
  /** The pages: the tile among the photos. */
  items: PostItem[];
  /** «Show exercises»: on until turned off (the user's «Visibili,
   * nascondibili»). */
  show: boolean;
};

/** A post not touched yet: a workout at the gym, seen by whom the last
 * one was (ADR-0304), the tile alone. */
export function newGymPost(owner: number | null): GymPost {
  return {
    choice: { ...NOT_CHOSEN, activity: "gym", visibility: loadVisibility(owner) },
    photos: [],
    items: [{ kind: "drawing" }],
    show: true,
  };
}

/**
 * The pages of a workout's post never ordered: its photos first and the
 * tile last, as the Feed shows it (TASK-385 B0, «Prima foto, se no
 * riquadro»), where a run's has its map first.
 */
export function tileLast(items: readonly PostItem[]): PostItem[] {
  return [
    ...items.filter((item) => item.kind !== "drawing"),
    ...items.filter((item) => item.kind === "drawing"),
  ];
}

/** The photos in the order of the post, from place 1 (keepPhotos), and the
 * order to send beside them: null while the tile is last or alone, the
 * order a post never ordered has. */
export function postPhotos(post: GymPost): {
  photos: string[];
  order: string[] | null;
} {
  const byPlace = new Map(post.photos.map((photo) => [photo.n, photo.base64]));
  const { photos, order } = renumbered<string>(
    post.items.flatMap(
      (item): ({ kind: "drawing" } | { kind: "photo"; photo: string })[] => {
        if (item.kind === "drawing") {
          return [item];
        }
        const base64 = byPlace.get(item.n);
        return base64 === undefined ? [] : [{ kind: "photo", photo: base64 }];
      },
    ),
  );
  return {
    photos,
    order: photos.length > 0 && order[order.length - 1] !== DRAWING_ITEM ? order : null,
  };
}

type Props = {
  post: GymPost;
  onPost: (next: GymPost) => void;
  disabled?: boolean;
  /** The fakes of the tests. */
  pick?: PickPhoto;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * The form of the post at the end of a workout (TASK-385 part D, the
 * user's «Sì, anche alla fine»), as at the end of a run: up to
 * GYM_MAX_PHOTOS photos with the yellow tile among them (the user's «10
 * foto»), the title, «How did it go?», the people tagged, who can see it,
 * and «Show exercises». It goes with «Save», with the workout.
 */
export function GymPostForm({ post, onPost, disabled, pick, fetchFn, apiKey }: Props) {
  const shown: ComposerPhoto[] = post.photos.map((photo) => ({
    n: photo.n,
    source: { uri: phonePhotoUri(photo.base64) },
    layout: null,
    original: null,
  }));
  return (
    <DrawingForm
      choice={post.choice}
      onChoice={(choice) => onPost({ ...post, choice })}
      items={post.items}
      photos={shown}
      onOrder={(items) => onPost({ ...post, items })}
      onAddPhotos={(added) => {
        const photos = [...post.photos];
        const items = [...post.items];
        // Before the tile while it is last, as the Feed will show them.
        const last = items[items.length - 1]?.kind === "drawing";
        for (const base64 of added) {
          const n = nextPlace(photos, GYM_MAX_PHOTOS);
          if (n === null) {
            break;
          }
          photos.push({ n, base64 });
          items.splice(last ? items.length - 1 : items.length, 0, { kind: "photo", n });
        }
        onPost({ ...post, photos, items });
      }}
      onRemovePhoto={(n) =>
        onPost({
          ...post,
          photos: post.photos.filter((photo) => photo.n !== n),
          items: post.items.filter((item) => item.kind === "drawing" || item.n !== n),
        })
      }
      track={null}
      extra={
        <SwitchRow
          label={t("Show exercises")}
          on={post.show}
          onChange={(show) => onPost({ ...post, show })}
          disabled={disabled}
        />
      }
      disabled={disabled}
      pick={pick}
      fetchFn={fetchFn}
      apiKey={apiKey}
    />
  );
}
