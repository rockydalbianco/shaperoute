import Constants from "expo-constants";

/** The port of `python -m shaperoute_api` (docs/API.md). */
export const API_PORT = 8000;

/**
 * The API runs on the PC that serves the app in development (ADR-0031): the
 * phone already reaches it at the host of the Expo dev server.
 *
 * `hostUri` is like "192.168.1.23:8081" or "[fe80::1]:8081"; without it
 * there is no address to guess, and the answer is null.
 */
export function apiUrlFromHost(hostUri: string | null | undefined): string | null {
  const host = hostUri?.match(/^(\[[^\]]+\]|[^:/]+)(:\d+)?$/)?.[1];
  return host ? `http://${host}:${API_PORT}` : null;
}

export function apiUrl(): string | null {
  return apiUrlFromHost(Constants.expoConfig?.hostUri);
}
