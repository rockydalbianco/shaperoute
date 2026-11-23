import {
  type EmitterSubscription,
  NativeEventEmitter,
  type NativeModule,
  Platform,
  TurboModuleRegistry,
} from "react-native";

import {
  decodeWatchMessage,
  encodeWatchMessage,
  type WatchMessage,
} from "./watchMessages";

/**
 * The phone's side of WatchConnectivity (TASK-370 part A3, ADR-0314): the
 * Apple Watch app's messages both ways. It talks to the native module of
 * react-native-watch-connectivity 2.0.0 by its names (the module
 * `WatchConnectivity`, its methods and events, read in the package's
 * `src/NativeWatchConnectivity.ts` and `ios/WatchConnectivity.mm`), without
 * the package: 2.0.0 throws as it is imported in an app without its native
 * part (`TurboModuleRegistry.getEnforcing`), which is every build until the
 * watch's own, the 1.1 (A-flip). There, and in Expo Go, on Android, in a
 * test, the link is null and nothing happens.
 */

/** The package's native module (react-native-watch-connectivity 2.0.0). */
export const WATCH_NATIVE_MODULE = "WatchConnectivity";

/** The package's events, as its native module sends them. */
export const WATCH_EVENTS = {
  /** A message: the fields, with an `id` when the watch waits for a reply. */
  message: "WatchReceiveMessage",
  /** The watch's application context: where its workout is. */
  context: "WatchApplicationContextReceived",
  /** User info: `{ userInfo, timestamp, id }`. */
  userInfo: "WatchUserInfoReceived",
  /** A file the watch sent (part B3c): `{ id, timestamp, url, metadata }`,
   * the file copied into the app's documents. */
  file: "WatchFileReceived",
} as const;

/** What the phone uses of the native module. */
export type WatchNative = {
  /** Resolves with the watch's reply; rejects when the watch is not there. */
  sendMessage(message: object): Promise<object>;
  replyToMessageWithId(messageId: string, message: object): void;
  transferUserInfo(userInfo: object): void;
  /** The context last sent: the package sends back each one it receives,
   * so this is the watch's last one. */
  getApplicationContext(): Promise<object | null>;
  /** Whether an Apple Watch is paired, and has the MuW app (part B3a). */
  getIsPaired(): Promise<boolean>;
  getIsWatchAppInstalled(): Promise<boolean>;
  /** The files received while nobody listened, by id (part B3c). */
  getQueuedFiles(): Promise<object>;
  /** Files done with: not given again. */
  dequeueFile(ids: string[]): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

/** The events of the native module, as NativeEventEmitter gives them. */
export type WatchEmitter = {
  addListener(event: string, listener: (body: unknown) => void): { remove(): void };
};

export type WatchLink = {
  /** Now, while the watch app is open; left out when it is not. */
  send(message: WatchMessage): void;
  /** Queued, and delivered also later: what the watch has to keep. */
  transfer(message: WatchMessage): void;
  /** The watch's messages, its application context (the one there already
   * too) and its user info, already read: one that does not read is left
   * out, as the messages' rules say. Returns the function that stops. */
  listen(onMessage: (message: WatchMessage) => void): () => void;
  /** Whether a watch is paired and has the app, so that what is sent to
   * it arrives (part B3a: «Send to watch» shows only then). Never throws. */
  ready(): Promise<boolean>;
};

/** The files the watch sends (part B3c): a finished workout. */
export type WatchFiles = {
  /** Each file, those that came before too; `done` with each once kept.
   * Returns the function that stops. */
  listen(onFile: (file: WatchFile) => void): () => void;
  done(fileId: string): void;
};

/** A file the watch sent, copied into the app's documents. */
export type WatchFile = { id: string; url: string; metadata: Record<string, unknown> };

/** The file in an event's body; null when it is not one. */
export function watchFileOf(body: unknown): WatchFile | null {
  if (!isFields(body)) {
    return null;
  }
  const { id, url, metadata } = body;
  if (typeof id !== "string" || typeof url !== "string") {
    return null;
  }
  return { id, url, metadata: isFields(metadata) ? metadata : {} };
}

type Fields = Record<string, unknown>;

function isFields(value: unknown): value is Fields {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** The link on `native`, whose events come from `emitter`. */
export function linkOn(native: WatchNative, emitter: WatchEmitter): WatchLink {
  const read = (onMessage: (message: WatchMessage) => void, value: unknown) => {
    const result = decodeWatchMessage(value);
    if (result.ok) {
      onMessage(result.message);
    }
  };
  return {
    send(message) {
      // Not there, or not answering: the watch hears the next one.
      native.sendMessage(encodeWatchMessage(message)).catch(() => {});
    },
    transfer(message) {
      try {
        native.transferUserInfo(encodeWatchMessage(message));
      } catch {
        // No session (no watch paired): nothing to keep.
      }
    },
    listen(onMessage) {
      let open = true;
      const subscriptions = [
        emitter.addListener(WATCH_EVENTS.message, (body) => {
          if (!isFields(body)) {
            return;
          }
          const { id, ...fields } = body;
          if (typeof id === "string") {
            // The watch waits for a reply: an empty one.
            native.replyToMessageWithId(id, {});
          }
          read(onMessage, fields);
        }),
        emitter.addListener(WATCH_EVENTS.context, (body) => read(onMessage, body)),
        emitter.addListener(WATCH_EVENTS.userInfo, (body) => {
          if (isFields(body)) {
            read(onMessage, body.userInfo);
          }
        }),
      ];
      native
        .getApplicationContext()
        .then((context) => {
          if (open && context !== null) {
            read(onMessage, context);
          }
        })
        .catch(() => {});
      return () => {
        open = false;
        for (const subscription of subscriptions) {
          subscription.remove();
        }
      };
    },
    async ready() {
      try {
        return (await native.getIsPaired()) && (await native.getIsWatchAppInstalled());
      } catch {
        return false;
      }
    },
  };
}

/** The files of the watch on `native`, whose events come from `emitter`. */
export function filesOn(native: WatchNative, emitter: WatchEmitter): WatchFiles {
  return {
    listen(onFile) {
      let open = true;
      const subscription = emitter.addListener(WATCH_EVENTS.file, (body) => {
        const file = watchFileOf(body);
        if (file !== null) {
          onFile(file);
        }
      });
      native
        .getQueuedFiles()
        .then((queued) => {
          if (!open || !isFields(queued)) {
            return;
          }
          for (const body of Object.values(queued)) {
            const file = watchFileOf(body);
            if (file !== null) {
              onFile(file);
            }
          }
        })
        .catch(() => {});
      return () => {
        open = false;
        subscription.remove();
      };
    },
    done(fileId) {
      try {
        native.dequeueFile([fileId]);
      } catch {
        // No session: nothing kept to give again.
      }
    },
  };
}

/** The native module, in an app built with it; null otherwise. */
function watchNative(): WatchNative | null {
  if (Platform.OS !== "ios") {
    return null;
  }
  try {
    return TurboModuleRegistry.get(WATCH_NATIVE_MODULE) as WatchNative | null;
  } catch {
    return null;
  }
}

let link: WatchLink | null | undefined;
let files: WatchFiles | null = null;

/** The link to the watch, made at its first use; null in an app without
 * the native module. */
export function watchLink(): WatchLink | null {
  if (link === undefined) {
    const native = watchNative();
    if (native === null) {
      link = null;
    } else {
      const events = new NativeEventEmitter(native as unknown as NativeModule);
      const emitter: WatchEmitter = {
        addListener: (event, listener): EmitterSubscription =>
          events.addListener(event, listener),
      };
      link = linkOn(native, emitter);
      files = filesOn(native, emitter);
    }
  }
  return link;
}

/** The files the watch sends, on the same native module; null without it. */
export function watchFiles(): WatchFiles | null {
  watchLink();
  return files;
}
