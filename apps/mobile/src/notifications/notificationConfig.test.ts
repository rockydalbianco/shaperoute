/// <reference types="node" />

import { readFileSync } from "fs";
import { join } from "path";

import { color } from "../theme/tokens";

/**
 * The notifications of `app.json` (TASK-262): a JSON file cannot read
 * `tokens.ts`, so this test holds them together.
 */
const config = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "app.json"), "utf8"),
) as { expo: { plugins: unknown[]; extra: { eas: { projectId: string } } } };

function notificationsPlugin(): Record<string, unknown> {
  const found = config.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-notifications",
  );
  if (!Array.isArray(found)) {
    throw new Error("expo-notifications is not among the plugins of app.json");
  }
  return found[1] as Record<string, unknown>;
}

test("the notification colour is the brand yellow of the tokens", () => {
  expect(notificationsPlugin().color).toBe(color.accent);
});

test("the notification icon is the app's monochrome one, and it exists", () => {
  const icon = notificationsPlugin().icon;
  expect(icon).toBe("./assets/android-icon-monochrome.png");
  expect(() => readFileSync(join(__dirname, "..", "..", String(icon)))).not.toThrow();
});

test("the tokens belong to the EAS project of app.json", () => {
  expect(config.expo.extra.eas.projectId).toMatch(/^[0-9a-f-]{36}$/);
});
