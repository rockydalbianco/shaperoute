/**
 * How much of a section's colour is in the veil of its card (TASK-523,
 * ADR-0417): at 12 % the text, the secondary text and the colour itself
 * keep 4.5:1 on the veil, in every tone at every step (`tint.test.ts`).
 */
export const TINT_SHARE = 0.12;

const HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * `colour` laid over `under` as a veil, as the one opaque colour it makes
 * (TASK-523, ADR-0417): the face of a section's card, the square behind an
 * icon. Both are `#RRGGBB` tokens; `share` is how much of `colour` there is,
 * 0 to 1. Opaque, so a card with a veil hides what is behind it as any card
 * does, and its contrast can be measured.
 */
export function tintOver(colour: string, under: string, share = TINT_SHARE): string {
  if (!HEX.test(colour) || !HEX.test(under)) {
    throw new Error(`tintOver takes #RRGGBB colours, got ${colour} over ${under}`);
  }
  const part = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
  const channel = (at: number) =>
    Math.round(
      parseInt(colour.slice(at, at + 2), 16) * part +
        parseInt(under.slice(at, at + 2), 16) * (1 - part),
    )
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}
