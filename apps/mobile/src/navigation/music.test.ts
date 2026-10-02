import { Linking } from "react-native";

import { openMusic, SPOTIFY_APP_URL, spotifyStoreUrl } from "./music";

let openURL: jest.SpiedFunction<typeof Linking.openURL>;

beforeEach(() => {
  openURL = jest.spyOn(Linking, "openURL");
});

afterEach(() => {
  openURL.mockRestore();
});

test("Music opens the Spotify app, and nothing else", async () => {
  openURL.mockResolvedValue(true);
  await openMusic();
  expect(openURL.mock.calls).toEqual([["spotify:"]]);
  expect(SPOTIFY_APP_URL).toBe("spotify:");
});

test("on a phone without Spotify, its page in the store", async () => {
  openURL.mockRejectedValueOnce(new Error("Unable to open URL: spotify:"));
  openURL.mockResolvedValueOnce(true);
  await openMusic();
  expect(openURL.mock.calls).toEqual([["spotify:"], [spotifyStoreUrl()]]);
});

test("if the store does not open either, nothing happens", async () => {
  openURL.mockRejectedValue(new Error("Unable to open URL"));
  await expect(openMusic()).resolves.toBeUndefined();
  expect(openURL).toHaveBeenCalledTimes(2);
});

test("the store is the phone's own", () => {
  expect(spotifyStoreUrl("ios")).toBe("https://apps.apple.com/app/id324684580");
  expect(spotifyStoreUrl("android")).toBe(
    "https://play.google.com/store/apps/details?id=com.spotify.music",
  );
  expect(spotifyStoreUrl("web")).toBe("https://open.spotify.com");
});
