import type { ImageOutline } from "@shaperoute/shared-types";
import { useCallback, useRef, useState } from "react";

import { type ImageOutcome, requestImageOutline } from "../api/imageOutlines";
import { type ImageSource, type Picked, type Picture, pickImage } from "./pickImage";

/** What can go wrong between choosing a picture and seeing its outline. */
export type ImageProblem =
  | Exclude<ImageOutcome, { kind: "outline" } | { kind: "cancelled" }>
  | Exclude<Picked, { kind: "picked" } | { kind: "cancelled" }>
  | { kind: "no_api_url" };

export type ImageState =
  | { status: "none" }
  /** The picture is on its way to the API, which traces its outline. */
  | { status: "tracing"; picture: Picture }
  | { status: "traced"; picture: Picture; outline: ImageOutline }
  /** `picture` is null when none was chosen: the picker failed. */
  | { status: "failed"; picture: Picture | null; problem: ImageProblem };

/**
 * The picture chosen for the route and the outline the engine traced from
 * it (TASK-073): the app shows it before the route is asked for. A new
 * choice drops the one before; cancelling the picker keeps it.
 */
export function useImageOutline(
  baseUrl: string | null,
  pick: (source: ImageSource) => Promise<Picked> = pickImage,
): {
  state: ImageState;
  choose: (source: ImageSource) => void;
} {
  const [state, setState] = useState<ImageState>({ status: "none" });
  const current = useRef<AbortController | null>(null);

  const choose = useCallback(
    (source: ImageSource) => {
      void (async () => {
        const picked = await pick(source);
        if (picked.kind === "cancelled") {
          return;
        }
        current.current?.abort();
        const mine = new AbortController();
        current.current = mine;
        if (picked.kind !== "picked") {
          setState({ status: "failed", picture: null, problem: picked });
          return;
        }
        const { picture } = picked;
        if (!baseUrl) {
          setState({ status: "failed", picture, problem: { kind: "no_api_url" } });
          return;
        }
        setState({ status: "tracing", picture });
        const answer = await requestImageOutline(baseUrl, picked.base64, {
          signal: mine.signal,
        });
        if (current.current !== mine || answer.kind === "cancelled") {
          return;
        }
        current.current = null;
        setState(
          answer.kind === "outline"
            ? { status: "traced", picture, outline: answer.outline }
            : { status: "failed", picture, problem: answer },
        );
      })();
    },
    [baseUrl, pick],
  );

  return { state, choose };
}
