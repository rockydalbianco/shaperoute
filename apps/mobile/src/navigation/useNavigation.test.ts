import * as Speech from "expo-speech";
import { Vibration } from "react-native";

import { play, VIBRATE_MS } from "./useNavigation";

jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));

test("each cue is said in English, and a turn also vibrates", () => {
  const vibrate = jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});
  play([
    { say: "Head out on Via Roma", vibrate: false },
    { say: "In 50 metres, turn left onto Via Verdi", vibrate: true },
  ]);
  expect(Speech.speak).toHaveBeenNthCalledWith(1, "Head out on Via Roma", {
    language: "en-US",
  });
  expect(Speech.speak).toHaveBeenNthCalledWith(
    2,
    "In 50 metres, turn left onto Via Verdi",
    { language: "en-US" },
  );
  expect(vibrate).toHaveBeenCalledTimes(1);
  expect(vibrate).toHaveBeenCalledWith(VIBRATE_MS);
});
