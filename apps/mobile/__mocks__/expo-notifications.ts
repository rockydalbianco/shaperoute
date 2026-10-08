/**
 * Stand-in for expo-notifications in tests (TASK-262): no phone, no Expo.
 * `phone` says what the phone answers: its permission, what the user says
 * when asked, the token Expo gives. `tap(data)` touches a notification;
 * `resetPhone()` puts everything back between tests.
 */

type Status = "granted" | "denied" | "undetermined";
type Response = {
  actionIdentifier: string;
  notification: {
    request: { identifier: string; content: { data: Record<string, unknown> } };
  };
};

export const phone = {
  permission: "undetermined" as Status,
  /** What the user answers to the question, while undetermined. */
  answer: "granted" as Status,
  canAskAgain: true,
  /** The Expo push token; null when Expo gives none (Expo Go, offline). */
  token: "ExponentPushToken[this-phone]" as string | null,
  /** The notification that opened the app, if one did. */
  last: null as Response | null,
};

const listeners = new Set<(response: Response) => void>();
let tapped = 0;

function permissions() {
  return {
    status: phone.permission,
    granted: phone.permission === "granted",
    canAskAgain: phone.canAskAgain,
    expires: "never",
  };
}

export const AndroidImportance = { DEFAULT: 3, HIGH: 4, MAX: 5 };

export const getPermissionsAsync = jest.fn(async () => permissions());

export const requestPermissionsAsync = jest.fn(async () => {
  if (phone.permission === "undetermined" && phone.canAskAgain) {
    phone.permission = phone.answer;
  }
  return permissions();
});

export const getExpoPushTokenAsync = jest.fn(async (_options?: unknown) => {
  if (phone.token === null) {
    throw new Error("No push token");
  }
  return { type: "expo", data: phone.token };
});

export const setNotificationChannelAsync = jest.fn(async () => null);

export const setNotificationHandler = jest.fn();

export const addNotificationResponseReceivedListener = jest.fn(
  (listener: (response: Response) => void) => {
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  },
);

export const getLastNotificationResponse = jest.fn(() => phone.last);

export const clearLastNotificationResponse = jest.fn(() => {
  phone.last = null;
});

/** A notification with `data`, as the phone hands it when touched. */
export function response(data: Record<string, unknown>): Response {
  tapped += 1;
  return {
    actionIdentifier: "expo.modules.notifications.actions.DEFAULT",
    notification: { request: { identifier: `n${tapped}`, content: { data } } },
  };
}

/** Touches a notification while the app is open. */
export function tap(data: Record<string, unknown>): void {
  const touched = response(data);
  for (const listener of [...listeners]) {
    listener(touched);
  }
}

export function resetPhone(): void {
  phone.permission = "undetermined";
  phone.answer = "granted";
  phone.canAskAgain = true;
  phone.token = "ExponentPushToken[this-phone]";
  phone.last = null;
  listeners.clear();
  for (const mock of [
    getPermissionsAsync,
    requestPermissionsAsync,
    getExpoPushTokenAsync,
    setNotificationChannelAsync,
    setNotificationHandler,
    addNotificationResponseReceivedListener,
    getLastNotificationResponse,
    clearLastNotificationResponse,
  ]) {
    mock.mockClear();
  }
}
