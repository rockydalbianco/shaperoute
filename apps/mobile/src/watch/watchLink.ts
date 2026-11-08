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
};

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

/** The link to the watch, made at its first use; null in an app without
 * the native module. */
export function watchLink(): WatchLink | null {
  if (link === undefined) {
    const native = watchNative();
    if (native === null) {
      link = null;
    } else {
      const emitter = new NativeEventEmitter(native as unknown as NativeModule);
      link = linkOn(native, {
        addListener: (event, listener): EmitterSubscription =>
          emitter.addListener(event, listener),
      });
    }
  }
  return link;
}
