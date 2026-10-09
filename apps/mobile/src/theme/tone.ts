import { File, Paths } from "expo-file-system";

/**
 * The app's tone (TASK-263, ADR-0231): dark, as it always was, or light.
 * No colours here: the palettes are in `./tokens`, which reads the choice.
 */
export type Tone = "dark" | "light";

/** In the order «Settings» offers them. */
export const TONES: readonly Tone[] = ["dark", "light"];

/**
 * How many brightness steps a tone has: 0 is its darkest, the last its
 * brightest.
 */
export const BRIGHTNESS_STEPS = 5;

/**
 * What «Settings» keeps: the tone, and the step each tone was left at, so
 * coming back to a tone finds it as it was.
 */
export type ToneChoice = {
  readonly tone: Tone;
  readonly dark: number;
  readonly light: number;
};

/**
 * With no choice made: dark at its darkest, the app as it was before
 * (ADR-0046). Light starts at white.
 */
export const DEFAULT_TONE: ToneChoice = {
  tone: "dark",
  dark: 0,
  light: BRIGHTNESS_STEPS - 1,
};

export const TONE_FILE = "tone.json";

function isTone(value: unknown): value is Tone {
  return value === "dark" || value === "light";
}

function isStep(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < BRIGHTNESS_STEPS
  );
}

/** The step the choice's own tone is at. */
export function stepOf(choice: ToneChoice): number {
  return choice[choice.tone];
}

/** The same choice, with the tone it is in now set to `step`. */
export function withStep(choice: ToneChoice, step: number): ToneChoice {
  return { ...choice, [choice.tone]: step };
}

/** Whether the app looks the same in both: the same tone, at the same step. */
export function sameTone(a: ToneChoice, b: ToneChoice): boolean {
  return a.tone === b.tone && stepOf(a) === stepOf(b);
}

/**
 * The choice kept on this phone; the default when none was made or it does
 * not read. A step that does not read takes the default of its tone.
 */
export function loadToneChoice(): ToneChoice {
  try {
    const file = new File(Paths.document, TONE_FILE);
    if (!file.exists) {
      return DEFAULT_TONE;
    }
    const data: unknown = JSON.parse(file.textSync());
    if (typeof data !== "object" || data === null) {
      return DEFAULT_TONE;
    }
    const kept = data as Record<string, unknown>;
    return {
      tone: isTone(kept.tone) ? kept.tone : DEFAULT_TONE.tone,
      dark: isStep(kept.dark) ? kept.dark : DEFAULT_TONE.dark,
      light: isStep(kept.light) ? kept.light : DEFAULT_TONE.light,
    };
  } catch {
    return DEFAULT_TONE;
  }
}

/**
 * Keeps the choice for the next opening. The app shows it only once it is
 * opened again (`./tokens` reads it as it loads): false when the phone
 * refused to keep it.
 */
export function saveToneChoice(choice: ToneChoice): boolean {
  try {
    const file = new File(Paths.document, TONE_FILE);
    file.create({ overwrite: true });
    file.write(
      JSON.stringify({ tone: choice.tone, dark: choice.dark, light: choice.light }),
    );
    return true;
  } catch {
    return false;
  }
}
