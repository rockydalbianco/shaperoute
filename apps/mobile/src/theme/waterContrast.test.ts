/**
 * A route on the water (TASK-191) is drawn over `color.map.water`, a dark
 * blue: the line, the cyan «Start here» on the shore and the line run must
 * read there at least as well as over the roads the other sports run on.
 * WCAG 2 contrast, from the tokens themselves.
 */
import { color, otherRoute, route, track } from "./tokens";

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

test("the yellow line reads on the water better than on a major road", () => {
  const onWater = contrast(route.color, color.map.water);
  expect(onWater).toBeGreaterThan(contrast(route.color, color.map.roadMajor));
  // Well past the 3:1 of a graphic and the 7:1 of small text.
  expect(onWater).toBeGreaterThan(11);
});

test("«Start here» on the shore and the line run read on the water too", () => {
  expect(contrast(color.startHere, color.map.water)).toBeGreaterThan(7);
  expect(contrast(track.color, color.map.water)).toBeGreaterThan(7);
  // The grey of the other routes, which the water never has (no A · B · C).
  expect(contrast(otherRoute.color, color.map.water)).toBeGreaterThan(3);
});

test("the contrast is the WCAG one", () => {
  expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  expect(contrast(color.map.water, color.map.water)).toBeCloseTo(1, 5);
});
