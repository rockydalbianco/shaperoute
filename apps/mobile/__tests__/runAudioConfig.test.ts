import appJson from "../app.json";
import de from "../locales/de.json";
import en from "../locales/en.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import it from "../locales/it.json";

/**
 * The native side of the run's voice (TASK-261 part B, ADR-0225): the
 * "audio" background mode, and expo-audio's microphone text, which Apple
 * wants in a build that carries expo-audio's recording code.
 */

type Plugin = string | [string, Record<string, unknown>];

const plugins = appJson.expo.plugins as Plugin[];
const nameOf = (plugin: Plugin) => (typeof plugin === "string" ? plugin : plugin[0]);
const at = (name: string) => plugins.findIndex((plugin) => nameOf(plugin) === name);

test("the voice speaks with the phone locked: the audio background mode", () => {
  expect(appJson.expo.ios.infoPlist.UIBackgroundModes).toContain("audio");
});

test("expo-audio: no recording on Android, no playback service, a microphone text", () => {
  const plugin = plugins[at("expo-audio")];
  expect(plugin).toEqual([
    "expo-audio",
    {
      microphonePermission: en.ios.NSMicrophoneUsageDescription,
      recordAudioAndroid: false,
      enableBackgroundPlayback: false,
    },
  ]);
});

test("expo-audio comes before expo-image-picker, so the picker's false does not remove its text", () => {
  // Expo runs the Info.plist changes from the last plugin to the first:
  // the picker's `microphonePermission: false` deletes the key, then
  // expo-audio writes it.
  expect(at("expo-audio")).toBeGreaterThanOrEqual(0);
  expect(at("expo-audio")).toBeLessThan(at("expo-image-picker"));
});

test("the microphone text is in every language", () => {
  for (const locale of [en, it, de, es, fr]) {
    expect(locale.ios.NSMicrophoneUsageDescription).toMatch(/^MuW /);
  }
});
