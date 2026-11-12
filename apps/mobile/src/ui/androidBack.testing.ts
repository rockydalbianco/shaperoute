import { BackHandler } from "react-native";

/**
 * Android's «back» key for the tests: the listeners of `BackHandler`, called
 * as React Native calls them, the one registered last first, until one
 * says it has handled the key. `press()` is true when one did; false, the
 * app would leave.
 */
export function androidBack(): { press: () => boolean; restore: () => void } {
  const listeners: { handler: () => boolean | null | undefined; on: boolean }[] = [];
  const spy = jest
    .spyOn(BackHandler, "addEventListener")
    .mockImplementation((_, handler) => {
      const listener = { handler: handler as () => boolean, on: true };
      listeners.push(listener);
      return {
        remove: () => {
          listener.on = false;
        },
      };
    });
  return {
    press: () => {
      for (const listener of [...listeners].reverse()) {
        if (listener.on && listener.handler() === true) {
          return true;
        }
      }
      return false;
    },
    restore: () => spy.mockRestore(),
  };
}
