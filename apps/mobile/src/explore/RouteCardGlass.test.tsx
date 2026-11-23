import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";

import { segmentTrackFace } from "../screens/Segmented";
import { color, glass, glassOf, paletteOf, radius } from "../theme/tokens";
import { DEFAULT_TONE } from "../theme/tone";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";
import { cardEdge, RouteCard } from "./RouteCard";

// The cards of «Explore» in the glass look (TASK-469 A4b, ADR-0383,
// «Capsula»): the card's radius, its edge of glass drawn over the drawing,
// the «match» badge as a capsule of glass laid on it. «Reduce
// Transparency» keeps the card as before; «Increase Contrast» gives it the
// strong edge.

jest.mock("../ui/useGlassMode", () => ({
  ...jest.requireActual("../ui/useGlassMode"),
  useGlassMode: jest.fn(),
}));
const glassMode = jest.mocked(useGlassMode);

const SQUARE: [number, number][] = [
  [45.0, 9.0],
  [45.0, 9.01],
  [45.01, 9.01],
  [45.01, 9.0],
  [45.0, 9.0],
];

type Shadow = { inset?: boolean; offsetY?: number; color?: string };
type Face = ViewStyle & { boxShadow?: Shadow[] };

function styleOf(testID: string): Face {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as Face;
}

async function card(mode: GlassMode, match?: number) {
  glassMode.mockReturnValue(mode);
  await render(
    <RouteCard
      width={173}
      line={SQUARE}
      title="Star · 5.1 km"
      detail="Trento · 450 m away"
      match={match}
      onPress={jest.fn()}
    />,
  );
}

test("the card has the glass look's radius, 28", async () => {
  await card("glass");
  expect(radius.card).toBe(28);
  expect(styleOf("route-card").borderRadius).toBe(radius.card);
  expect(styleOf("route-card").backgroundColor).toBe(color.surface);
});

test("on glass the edge is drawn over the card: a thin rim and the light on top", async () => {
  await card("glass");
  const edge = styleOf("route-card-edge");
  expect(edge.position).toBe("absolute");
  expect(edge.borderRadius).toBe(radius.card);
  expect(screen.getByTestId("route-card-edge").props.pointerEvents).toBe("none");
  const shadows = edge.boxShadow ?? [];
  expect(shadows.every((each) => each.inset)).toBe(true);
  expect(shadows.map((each) => each.color)).toEqual([glass.rim, glass.rimTop]);
});

test("«Reduce Transparency»: no edge, the card as before", async () => {
  await card("solid");
  expect(styleOf("route-card-edge").boxShadow).toBeUndefined();
});

test("«Increase Contrast»: the strong edge of the controls", async () => {
  await card("contrast");
  expect(styleOf("route-card-edge").boxShadow?.[0]?.color).toBe(color.borderStrong);
});

test.each(["glass", "solid", "contrast"] as const)(
  "the «match» badge is a capsule laid on the drawing (%s), never yellow",
  async (mode) => {
    await card(mode, 0.87);
    expect(screen.getByText("87%")).toHaveStyle({ color: color.text });
    const badge = styleOf("route-card-match");
    expect(badge.backgroundColor).toBe(segmentTrackFace(mode).backgroundColor);
    expect(badge.boxShadow).toEqual(segmentTrackFace(mode).boxShadow);
    expect(badge.backgroundColor).not.toBe(color.accent);
  },
);

test("in the light tone the edge comes from the light glass, never yellow", () => {
  const choice = { ...DEFAULT_TONE, tone: "light" as const };
  const colors = glassOf(choice);
  const accent = paletteOf(choice).accent.toUpperCase();
  const shadows = cardEdge("glass", colors).boxShadow as unknown as Shadow[];
  expect(shadows.map((each) => each.color)).toEqual([colors.rim, colors.rimTop]);
  for (const each of shadows) {
    expect(String(each.color).slice(0, 7).toUpperCase()).not.toBe(accent);
  }
});
