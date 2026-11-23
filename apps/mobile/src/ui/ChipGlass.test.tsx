import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react-native";
import { type StyleProp, StyleSheet, type ViewStyle } from "react-native";

import { ChoiceChips } from "../share/ScenesRows";
import { color, glass } from "../theme/tokens";
import { glassRaise } from "./glassRaise";
import { type GlassMode, useGlassMode } from "./useGlassMode";

// The chips stand out of the glass (TASK-469 A7c, ADR-0383, «Capsula»), as
// the chips of the search already do: a line of light on top and a short
// shadow under, no colour added, the chosen one keeps its own face. With
// «Reduce Transparency» or «Increase Contrast» they stay flat, as before.

jest.mock("./useGlassMode", () => ({
  ...jest.requireActual("./useGlassMode"),
  useGlassMode: jest.fn(),
}));

type Shadow = { inset?: boolean; color?: string };
type Face = ViewStyle & { boxShadow?: Shadow[] };

function face(testID: string): Face {
  const style = screen.getByTestId(testID).props.style as StyleProp<ViewStyle>;
  return (StyleSheet.flatten(style) ?? {}) as Face;
}

function Kinds({ chosen }: { chosen: "a" | "b" }) {
  return (
    <ChoiceChips
      choices={["a", "b"] as const}
      chosen={chosen}
      nameOf={(choice) => choice.toUpperCase()}
      onChange={() => {}}
      testID="kind"
    />
  );
}

describe.each(["glass", "solid", "contrast"] as const)("%s", (mode: GlassMode) => {
  test("each chip wears the raise of the mode, the chosen one its own face", async () => {
    jest.mocked(useGlassMode).mockReturnValue(mode);
    await render(<Kinds chosen="b" />);
    const want = (glassRaise(mode) as Face).boxShadow;
    const plain = face("kind-a");
    const chosen = face("kind-b");
    expect(plain.boxShadow).toEqual(want);
    expect(chosen.boxShadow).toEqual(want);
    // The chosen one keeps its stronger border and raised face.
    expect(chosen.borderColor).toBe(color.text);
    expect(chosen.backgroundColor).toBe(color.surfaceRaised);
    expect(plain.borderColor).toBe(color.borderStrong);
  });
});

test("on glass, the light on top and the short shadow: never yellow", () => {
  const shadows = (glassRaise("glass") as Face).boxShadow ?? [];
  expect(shadows.map((each) => each.color)).toEqual([glass.shadow, glass.rimTop]);
  expect(shadows.map((each) => each.color)).not.toContain(color.accent);
  expect(glassRaise("solid")).toEqual({});
  expect(glassRaise("contrast")).toEqual({});
});

// Every chip of these pages takes the raise right after its own style.
const CHIPS = [
  "activities/ActivityCalendar.tsx",
  "feed/SleepPostPage.tsx",
  "feed/StyleLens.tsx",
  "gym/TargetSteps.tsx",
  "imports/PhotoPostForm.tsx",
  "liveShare/LiveShareButton.tsx",
  "paddle/PaddleExplore.tsx",
  "pool/PoolDraw.tsx",
  "share/MusicRow.tsx",
  "share/ScenesRows.tsx",
  "share/SharePost.tsx",
  "ski/DayChoices.tsx",
  "social/PublicParts.tsx",
  "social/composer/PostComposer.tsx",
  "social/outfit/OutfitTagEditor.tsx",
];

test.each(CHIPS)("%s: each chip stands out of the glass", (file) => {
  const source = readFileSync(join(__dirname, "..", file), "utf8");
  expect(source).toMatch(/const chipRaise = glassRaise\(useGlassMode\(\)\);/);
  const uses = source.match(/styles\.chip(?=[,\]}\s])/g) ?? [];
  const raised = source.match(/styles\.chip,\s*chipRaise[,\]]/g) ?? [];
  expect(uses.length).toBeGreaterThan(0);
  expect(raised).toHaveLength(uses.length);
});
