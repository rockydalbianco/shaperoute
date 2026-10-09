import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

/**
 * What the map shows under the route (TASK-264, ADR-0232): the app's own
 * dark map, aerial photos, or the dark map in 3D with buildings and hills.
 */
export type MapKind = "standard" | "satellite" | "3d";

/** In the order the map's button offers them. */
export const MAP_KINDS: readonly MapKind[] = ["standard", "satellite", "3d"];

export function isMapKind(value: unknown): value is MapKind {
  return value === "standard" || value === "satellite" || value === "3d";
}

export const MAP_KIND_FILE = "map-kind.json";

/** The kind kept on this phone; the standard map when none was chosen or it does not read. */
export function loadMapKind(): MapKind {
  try {
    const file = new File(Paths.document, MAP_KIND_FILE);
    if (!file.exists) {
      return "standard";
    }
    const data: unknown = JSON.parse(file.textSync());
    const kind =
      typeof data === "object" && data !== null && "kind" in data ? data.kind : null;
    return isMapKind(kind) ? kind : "standard";
  } catch {
    return "standard";
  }
}

/** The kind the map shows now; read from the phone on first use. */
let current: MapKind | null = null;

export function appMapKind(): MapKind {
  if (current === null) {
    current = loadMapKind();
  }
  return current;
}

const listeners = new Set<() => void>();

export function subscribeMapKind(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Keeps the kind for the next opening and shows the map in it now; a phone
 * that refuses to keep it still has it until the app closes.
 */
export function saveMapKind(kind: MapKind): void {
  try {
    const file = new File(Paths.document, MAP_KIND_FILE);
    if (kind === "standard") {
      if (file.exists) {
        file.delete();
      }
    } else {
      file.create({ overwrite: true });
      file.write(JSON.stringify({ kind }));
    }
  } catch {
    // The kind still holds while the app is open.
  }
  if (kind === appMapKind()) {
    return;
  }
  current = kind;
  for (const listener of listeners) {
    listener();
  }
}

/** The kind the map shows, and a new render each time it changes. */
export function useMapKind(): MapKind {
  return useSyncExternalStore(subscribeMapKind, appMapKind, appMapKind);
}
