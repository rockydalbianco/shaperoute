import Constants from "expo-constants";

/** The port of `python -m shaperoute_api` (docs/API.md). */
export const API_PORT = 8000;

/** Where the API looks for its key, when one is set (TASK-081, ADR-0076). */
export const API_KEY_HEADER = "X-API-Key";

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

/**
 * EXPO_PUBLIC_API_URL in apps/mobile/.env, when the API is not beside the
 * Expo server: the PC through Tailscale, a tunnel, a server (docs/DEPLOY.md).
 * Without it, the address of the Expo server, as before.
 */
export function apiUrl(
  configured: string | undefined = process.env.EXPO_PUBLIC_API_URL,
  hostUri: string | null | undefined = Constants.expoConfig?.hostUri,
): string | null {
  const url = configured?.trim().replace(/\/+$/, "");
  return url ? url : apiUrlFromHost(hostUri);
}

/** EXPO_PUBLIC_API_KEY in apps/mobile/.env: the API's SHAPEROUTE_API_KEY. */
export function apiKey(
  configured: string | undefined = process.env.EXPO_PUBLIC_API_KEY,
): string | null {
  return configured?.trim() || null;
}

/** The header that carries the key, or none without a key. */
export function keyHeaders(key: string | null = apiKey()): Record<string, string> {
  return key ? { [API_KEY_HEADER]: key } : {};
}
