import type { EditKind, OutlinePoint } from "@shaperoute/shared-types";
import { createContext } from "react";

import type { EditsState } from "./useImageOutline";

/** What the outline's editor shows and does (TASK-079): the edits made so
 * far; add a line drawn over the picture, as a part or a detail; take the
 * last one away. */
export type ImageEdits = EditsState & {
  add: (kind: EditKind, line: OutlinePoint[]) => void;
  undo: () => void;
};

/**
 * Handed from the screen to the image panel, past the route panel between
 * them. Without it the outline is shown but cannot be edited.
 */
export const ImageEditsContext = createContext<ImageEdits | null>(null);
