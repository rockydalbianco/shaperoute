import { readFileSync } from "fs";
import path from "path";

import {
  WATCH_COMMANDS,
  WATCH_PHASES,
  WATCH_PROTOCOL_VERSION,
  decodeWatchMessage,
  encodeWatchMessage,
  type WatchMessage,
} from "./watchMessages";

/** The JSON in targets/watch/Core/Fixtures/, which the watch's XCTest reads
 * too. */
function fixture<T>(name: string): T {
  const file = path.join(
    __dirname,
    "..",
    "..",
    "targets",
    "watch",
    "Core",
    "Fixtures",
    name,
  );
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

type Valid = { name: string; json: unknown; encoded?: unknown };
type Invalid = { name: string; json: unknown; error: string };
const MESSAGES = fixture<{ valid: Valid[]; invalid: Invalid[] }>("messages.json");
const TRANSITIONS = fixture<{ phases: string[]; events: string[] }>("transitions.json");

describe("the watch's messages", () => {
  it.each(MESSAGES.valid.map((entry) => [entry.name, entry] as const))(
    "read and write back: %s",
    (_name, entry) => {
      const read = decodeWatchMessage(entry.json);
      if (!read.ok) {
        throw new Error(`refused: ${read.error}`);
      }
      expect(encodeWatchMessage(read.message)).toEqual(entry.encoded ?? entry.json);
    },
  );

  it.each(MESSAGES.invalid.map((entry) => [entry.name, entry] as const))(
    "are refused with the watch's code: %s",
    (_name, entry) => {
      expect(decodeWatchMessage(entry.json)).toEqual({ ok: false, error: entry.error });
    },
  );

  it("have the phases of the watch's state machine, and its commands", () => {
    expect([...WATCH_PHASES]).toEqual(TRANSITIONS.phases);
    for (const command of WATCH_COMMANDS) {
      expect(TRANSITIONS.events).toContain(command);
    }
  });

  it("say their version", () => {
    const message: WatchMessage = { type: "heartRate", bpm: 120, at: 5 };
    expect(encodeWatchMessage(message)).toEqual({
      v: WATCH_PROTOCOL_VERSION,
      type: "heartRate",
      bpm: 120,
      at: 5,
    });
  });

  it("read a start with its sport", () => {
    const read = decodeWatchMessage(
      encodeWatchMessage({
        type: "command",
        command: "start",
        activity: "cycling",
        from: "phone",
        at: 9,
      }),
    );
    expect(read).toEqual({
      ok: true,
      message: {
        type: "command",
        command: "start",
        activity: "cycling",
        from: "phone",
        at: 9,
      },
    });
  });
});
