import { render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { type StyleProp, StyleSheet, type ViewStyle } from "react-native";

import { AboutRows } from "../about/AboutRows";
import { segmentTrackFace } from "../screens/Segmented";
import { color, glass, radius } from "../theme/tokens";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";
import { LanguageSetting } from "./LanguageSetting";
import { settingsGroupFace } from "./settingsGroup";
import { loadSport } from "./sport";
import { SportSetting } from "./SportSetting";
import { UnitsSetting } from "./UnitsSetting";

// The groups of rows of «Settings» in the glass look (TASK-469 A6,
// ADR-0383, «Capsula»): corners at 24, the edges of the laid glass, the
// face still `surface` so the words keep their contrast. «Reduce
// Transparency» keeps them as before; «Increase Contrast» gives the strong
// edge.

jest.mock("../ui/useGlassMode", () => ({
  ...jest.requireActual("../ui/useGlassMode"),
  useGlassMode: jest.fn(),
}));
jest.mock("./sport", () => ({
  ...jest.requireActual<typeof import("./sport")>("./sport"),
  loadSport: jest.fn(),
  saveSport: jest.fn(),
}));
jest.mock("../units/units", () => {
  const actual = jest.requireActual<typeof import("../units/units")>("../units/units");
  return { ...actual, loadUnitsChoice: jest.fn(() => "phone") };
});
jest.mock("../units/phoneUnits", () => ({ phoneUnits: jest.fn(() => "km") }));

type Shadow = { inset?: boolean; color?: string };
type Face = ViewStyle & { boxShadow?: Shadow[] };

beforeEach(() => {
  jest.mocked(loadSport).mockReturnValue("run");
});

test("a group is 24 at the corners, a new step of the radii", () => {
  expect(radius.group).toBe(24);
  expect(settingsGroupFace("glass").borderRadius).toBe(radius.group);
});

test("on glass: the edges of the laid glass, the face still surface", () => {
  const face = settingsGroupFace("glass") as Face;
  expect(face.backgroundColor).toBe(color.surface);
  expect(face.borderWidth).toBe(0);
  expect(face.boxShadow).toEqual(segmentTrackFace("glass").boxShadow);
  const colours = (face.boxShadow ?? []).map((each) => each.color);
  expect(colours).toEqual(expect.arrayContaining([glass.rim, glass.rimTop]));
  // Never yellow.
  expect(colours).not.toContain(color.accent);
});

test("«Reduce Transparency»: as before, surface edged in border", () => {
  const face = settingsGroupFace("solid") as Face;
  expect(face.backgroundColor).toBe(color.surface);
  expect(face.boxShadow?.map((each) => each.color)).toEqual([color.border]);
});

test("«Increase Contrast»: the strong edge", () => {
  const face = settingsGroupFace("contrast") as Face;
  expect(face.backgroundColor).toBe(color.surface);
  expect(face.boxShadow?.map((each) => each.color)).toEqual([color.borderStrong]);
});

/** The rendered tree as JSON, and every node in it `where` says. */
type Json = {
  type: string;
  props: Record<string, unknown>;
  children: (Json | string)[] | null;
};
function nodes(
  node: Json | string | null | undefined,
  where: (node: Json) => boolean,
): Json[] {
  if (node == null || typeof node === "string") {
    return [];
  }
  const own = where(node) ? [node] : [];
  return [...own, ...(node.children ?? []).flatMap((child) => nodes(child, where))];
}

function groups(): Face[] {
  const tree = screen.toJSON() as unknown as Json | null;
  return nodes(tree, (node) => {
    const style = StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>) ?? {};
    return node.type === "View" && style.borderRadius === radius.group;
  }).map(
    (node) => StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>) as Face,
  );
}

const SETTINGS: [string, () => ReactElement][] = [
  ["Language", () => <LanguageSetting />],
  ["Units", () => <UnitsSetting />],
  ["Sport", () => <SportSetting />],
  ["About", () => <AboutRows onOpen={jest.fn()} />],
];

describe.each(["glass", "solid", "contrast"] as const)("%s", (mode: GlassMode) => {
  test.each(SETTINGS)("«%s» wears the group's face", async (_name, setting) => {
    jest.mocked(useGlassMode).mockReturnValue(mode);
    await render(setting());
    const [group, ...more] = groups();
    expect(more).toHaveLength(0);
    expect(group.backgroundColor).toBe(color.surface);
    expect(group.borderWidth).toBe(0);
    expect(group.boxShadow).toEqual(settingsGroupFace(mode).boxShadow);
  });
});
