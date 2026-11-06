import { type DrawingChoice, NOT_CHOSEN } from "../api/drawings";
import type { GymPhoto } from "../gym/GymPostForm";
import { phonePhotoUri } from "../social/drawingPhotos";
import type { ComposerPhoto } from "../social/composer/PostComposer";
import { DRAWING_ITEM, type PostItem, renumbered } from "../social/composer/postOrder";
import { DrawingForm, nextPlace, type PickPhoto } from "../social/PublicParts";
import { loadVisibility } from "../social/visibilityChoice";
import { GYM_MAX_PHOTOS } from "../sports/gym";

/** The photos of a post of a swim in a pool: as many as a workout's, every
 * place the API keeps, the tile among them (the user's «come la
 * Palestra», 2026-11-06). */
export const POOL_MAX_PHOTOS = GYM_MAX_PHOTOS;

/** The post of a swim in a pool as the end of it holds it (TASK-400 part
 * C): as a workout's (GymPost), without «Show exercises». */
export type PoolPost = {
  choice: DrawingChoice;
  photos: GymPhoto[];
  /** The pages: the tile among the photos. */
  items: PostItem[];
};

/** A post not touched yet: a swim, seen by whom the last post was
 * (ADR-0304), the tile alone. */
export function newPoolPost(owner: number | null): PoolPost {
  return {
    choice: { ...NOT_CHOSEN, activity: "swimming", visibility: loadVisibility(owner) },
    photos: [],
    items: [{ kind: "drawing" }],
  };
}

/** The photos in the order of the post, and the order to send beside them:
 * null while the tile is last or alone, as a workout's (postPhotos). */
export function poolPostPhotos(post: PoolPost): {
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
  post: PoolPost;
  onPost: (next: PoolPost) => void;
  disabled?: boolean;
  /** The fakes of the tests. */
  pick?: PickPhoto;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * The form of the post at the end of a swim in a pool (TASK-400 part C,
 * the user's «Sì, come la Palestra»): the photos with the yellow tile among
 * them, the title, «How did it go?», the people tagged and who can see it.
 * A swim stays a swim and enters no contest. It goes with «Save», with
 * the swim.
 */
export function PoolPostForm({ post, onPost, disabled, pick, fetchFn, apiKey }: Props) {
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
          const n = nextPlace(photos, POOL_MAX_PHOTOS);
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
      pool
      disabled={disabled}
      pick={pick}
      fetchFn={fetchFn}
      apiKey={apiKey}
    />
  );
}
