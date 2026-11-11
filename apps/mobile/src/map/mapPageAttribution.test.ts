/**
 * The attribution of the map (TASK-443): in the colours of the app and no
 * longer MapLibre's light grey band, with the words and the links of
 * OpenStreetMap and OpenFreeMap always there and readable in every tone,
 * as their licences ask.
 */
import { color, type Palette, paletteOf } from "../theme/tokens";
import { BRIGHTNESS_STEPS, DEFAULT_TONE, type Tone, TONES } from "../theme/tone";
import { ATTRIBUTION_COLORS, attributionColors, buildMapPage } from "./mapPage";
import { ATTRIBUTION } from "./mapStyle";

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

function at(tone: Tone, step: number): Palette {
  return paletteOf({ ...DEFAULT_TONE, tone, [tone]: step });
}

const EVERY = TONES.flatMap((tone) =>
  Array.from(
    { length: BRIGHTNESS_STEPS },
    (_, step) => [tone, step, at(tone, step)] as const,
  ),
);

const page = buildMapPage("en");

test("the attribution is always open, where MapLibre puts it", () => {
  // Not compact: the words are there without a tap. No place asked: the
  // bottom right of the map, away from the buttons at its top.
  expect(page).toContain("new maplibregl.AttributionControl({ compact: false })");
  expect(page).toContain("attributionControl: false");
  expect(page.match(/AttributionControl\(/g)).toHaveLength(1);
});

test("its words and its links are the style's own, untouched", () => {
  // The page draws the attribution of its style's source, as it is there.
  expect(ATTRIBUTION).toContain("OpenFreeMap");
  expect(ATTRIBUTION).toContain("OpenMapTiles");
  expect(ATTRIBUTION).toContain(
    '<a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
  );
  expect(page).toContain(JSON.stringify(ATTRIBUTION).replace(/</g, "\\u003c"));
});

test("the page colours it from the tokens and hides none of it", () => {
  expect(ATTRIBUTION_COLORS).toEqual({
    background: color.surface,
    text: color.textMuted,
    link: color.text,
  });
  const rule = page.match(/\.maplibregl-ctrl\.maplibregl-ctrl-attrib \{([^}]*)\}/);
  expect(rule?.[1]).toContain(`background-color: ${ATTRIBUTION_COLORS.background};`);
  expect(rule?.[1]).toContain(`color: ${ATTRIBUTION_COLORS.text};`);
  expect(page).toContain(
    `.maplibregl-ctrl.maplibregl-ctrl-attrib a { color: ${ATTRIBUTION_COLORS.link}; }`,
  );
  // Nothing in the page's own styles takes the attribution away or shrinks it.
  const styles = page.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  expect(styles).not.toMatch(
    /display:\s*none|visibility:\s*hidden|opacity|font-size:\s*0/,
  );
});

test.each(EVERY)(
  "in the %s tone at step %i the words and the links are readable",
  (_tone, _step, palette) => {
    const colors = attributionColors(palette);
    expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.link, colors.background)).toBeGreaterThanOrEqual(7);
  },
);
