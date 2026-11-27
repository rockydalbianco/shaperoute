import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { color, type Palette, paletteOf, radius } from "../theme/tokens";
import { BRIGHTNESS_STEPS, DEFAULT_TONE, TONES } from "../theme/tone";
import { HERO_HALO_SHARE, HeroCard } from "./HeroCard";
import { TINT_SHARE, tintOver } from "./tint";

// The large card at the top of a page (TASK-523 part A2).

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const STEPS = Array.from({ length: BRIGHTNESS_STEPS }, (_, step) => step);
const EVERY = TONES.flatMap((tone) =>
  STEPS.map(
    (step) =>
      [
        tone,
        step,
        paletteOf({ ...DEFAULT_TONE, tone, [tone]: step }) as Palette,
      ] as const,
  ),
);

const look = (testID: string) =>
  StyleSheet.flatten(
    screen.getByTestId(testID, { includeHiddenElements: true }).props.style,
  );

test("the card is the section's veil, its halo the same colour, stronger", async () => {
  await render(
    <HeroCard colour={color.section.draw} testID="hero">
      <Text>Roads follow your drawing</Text>
    </HeroCard>,
  );
  expect(look("hero")).toMatchObject({
    backgroundColor: tintOver(color.section.draw, color.surface),
    borderRadius: radius.card,
    overflow: "hidden",
  });
  expect(HERO_HALO_SHARE).toBeGreaterThan(TINT_SHARE);
  expect(look("hero-halo").backgroundColor).toBe(
    tintOver(color.section.draw, color.surface, HERO_HALO_SHARE),
  );
  expect(screen.getByText("Roads follow your drawing")).toBeOnTheScreen();
});

test("the halo is a picture: it takes no touch and screen readers pass it by", async () => {
  await render(<HeroCard colour={color.section.profile} testID="hero" />);
  const halo = screen.getByTestId("hero-halo", { includeHiddenElements: true });
  expect(halo.props.pointerEvents).toBe("none");
  expect(halo.props.accessibilityElementsHidden).toBe(true);
  expect(halo.props.importantForAccessibility).toBe("no-hide-descendants");
});

test.each(EVERY)(
  "%s at step %i: a title and a ring read where they cross the halo",
  (_tone, _step, c) => {
    for (const section of Object.values(c.section)) {
      const halo = tintOver(section, c.surface, HERO_HALO_SHARE);
      expect(contrast(c.text, halo)).toBeGreaterThanOrEqual(4.5);
      // A ring or an icon in the section's colour: a graphic.
      expect(contrast(section, halo)).toBeGreaterThanOrEqual(3);
    }
  },
);
