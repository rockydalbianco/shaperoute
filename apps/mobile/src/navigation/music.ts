import { Linking, Platform } from "react-native";

/**
 * Music for a run (TASK-173, ADR-0141). Sgrava plays nothing and knows
 * nothing of what is playing: «Music» opens the runner's music app, and
 * the runner comes back by themselves. Spotify, the app the user runs with.
 */

/** Spotify's own scheme: the app opens where it was left. */
export const SPOTIFY_APP_URL = "spotify:";

/** Where Spotify is got, on a phone that does not have it. */
export function spotifyStoreUrl(os: string = Platform.OS): string {
  switch (os) {
    case "ios":
      return "https://apps.apple.com/app/id324684580";
    case "android":
      return "https://play.google.com/store/apps/details?id=com.spotify.music";
    default:
      return "https://open.spotify.com";
  }
}

/**
 * Opens Spotify, or its page in the store on a phone without it. The app
 * is opened, not asked for first: `canOpenURL` says no to a scheme the
 * build does not declare, and Expo Go declares none of ours. If the store
 * does not open either, nothing happens: the run goes on.
 */
export async function openMusic(): Promise<void> {
  try {
    await Linking.openURL(SPOTIFY_APP_URL);
  } catch {
    await Linking.openURL(spotifyStoreUrl()).catch(() => {});
  }
}
