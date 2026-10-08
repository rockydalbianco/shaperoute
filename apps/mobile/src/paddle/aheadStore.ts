import { File, Paths } from "expo-file-system";

/**
 * The file of the shapes on the water drawn ahead of «Explore» (TASK-246):
 * beside the examples the page keeps (city-examples.json), which holds the
 * places chosen last and would push these out. Nothing but the file is
 * here, so that the examples can read it (exampleRoutes.ts) and the round
 * that writes it (aheadExamples.ts) can read the examples.
 */
export const AHEAD_EXAMPLES_FILE = "paddle-ahead.json";

export type AheadFile = {
  /** By the key of a place's examples, its routes whole, as the page's
   * file keeps them: read with `readKept`, one by one. */
  examples: Record<string, unknown>;
  /** By the same key, the shapes the API could not draw there, and when it
   * said so, in ms since 1970. */
  leftOut: Record<string, Record<string, number>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** What the phone has ahead; nothing when the file does not read. */
export function readAheadFile(): AheadFile {
  try {
    const file = new File(Paths.document, AHEAD_EXAMPLES_FILE);
    if (!file.exists) {
      return { examples: {}, leftOut: {} };
    }
    const data: unknown = JSON.parse(file.textSync());
    const whole = isRecord(data) ? data : {};
    const leftOut: AheadFile["leftOut"] = {};
    for (const [key, shapes] of Object.entries(
      isRecord(whole.leftOut) ? whole.leftOut : {},
    )) {
      if (isRecord(shapes)) {
        leftOut[key] = Object.fromEntries(
          Object.entries(shapes).filter(
            (entry): entry is [string, number] => typeof entry[1] === "number",
          ),
        );
      }
    }
    return { examples: isRecord(whole.examples) ? whole.examples : {}, leftOut };
  } catch {
    return { examples: {}, leftOut: {} };
  }
}

export function writeAheadFile(data: AheadFile): void {
  try {
    const file = new File(Paths.document, AHEAD_EXAMPLES_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify(data));
  } catch {
    // A convenience: without the file the shapes are drawn on the page.
  }
}
