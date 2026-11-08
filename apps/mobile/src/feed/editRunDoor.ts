import type { LatLon } from "@shaperoute/shared-types";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";

/**
 * «Edit & run» on the page of a post (TASK-410, ADR-0340): the line of the
 * drawing on the map of «Draw on the map», where it is, to change and then
 * run (TASK-369, «Edit the drawing»). The app knows how; the page only
 * asks. Undefined when there is no line to edit.
 */
export type EditRunDoor = (line: readonly LatLon[]) => (() => void) | undefined;

/** Without the app around it (a test of one screen): no button. */
export const EditRunContext = createContext<EditRunDoor>(() => undefined);

export function useEditRunDoor(): EditRunDoor {
  return useContext(EditRunContext);
}

/**
 * The door for the app, from what edits a line: the same door from render
 * to render, whatever `onEdit` is this time, so the page under it is not
 * drawn again with the app.
 */
export function useEditRunOf(
  onEdit: (line: readonly LatLon[]) => (() => void) | undefined,
): EditRunDoor {
  const latest = useRef(onEdit);
  useEffect(() => {
    latest.current = onEdit;
  });
  return useMemo(
    () => (line) => (line.length >= 2 ? () => latest.current(line)?.() : undefined),
    [],
  );
}
