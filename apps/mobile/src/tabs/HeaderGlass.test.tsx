import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";

import { BellButton, headerGlass } from "../bell/BellButton";
import { useBell } from "../bell/bellDoor";
import { segmentTrackFace } from "../screens/Segmented";
import { SportButton } from "../settings/SportButton";
import { loadSport, SPORTS } from "../settings/sport";
import { color, glass, radius } from "../theme/tokens";
import { glassRaise } from "../ui/glassRaise";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";

// The round buttons of the header in the glass look (TASK-469 A5, ADR-0383,
// «Capsula»): the bell and the sport, each a circle of glass raised out of
// the page, with the strong edge of the controls. «Reduce Transparency» and
// «Increase Contrast» make them opaque.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");
jest.mock("../settings/sport", () => {
  const actual =
    jest.requireActual<typeof import("../settings/sport")>("../settings/sport");
  return { ...actual, loadSport: jest.fn(), saveSport: jest.fn() };
});
jest.mock("../bell/bellDoor", () => ({
  ...jest.requireActual("../bell/bellDoor"),
  useBell: jest.fn(),
}));
jest.mock("../ui/useGlassMode", () => ({
  ...jest.requireActual("../ui/useGlassMode"),
  useGlassMode: jest.fn(),
}));
const glassMode = jest.mocked(useGlassMode);

type Shadow = { inset?: boolean; color?: string };
type Face = ViewStyle & { boxShadow?: Shadow[] };

function flat(style: unknown): Face {
  return StyleSheet.flatten(style as ViewStyle) as Face;
}

beforeEach(() => {
  jest.mocked(loadSport).mockReturnValue("run");
  jest.mocked(useBell).mockReturnValue({
    unread: 3,
    open: jest.fn(),
    read: jest.fn(),
  } as unknown as ReturnType<typeof useBell>);
});

test("on glass: the laid glass, raised, with the strong edge, round", () => {
  const face = headerGlass("glass") as Face;
  expect(face.backgroundColor).toBe(glass.fill);
  expect(face.borderWidth).toBe(1);
  expect(face.borderColor).toBe(color.borderStrong);
  expect(face.borderRadius).toBe(radius.pill);
  const laid = (segmentTrackFace("glass").boxShadow ?? []) as unknown as Shadow[];
  const raised = (glassRaise("glass").boxShadow ?? []) as unknown as Shadow[];
  expect(face.boxShadow).toEqual([...laid, ...raised]);
  expect(face.boxShadow?.some((each) => !each.inset)).toBe(true);
});

test.each(["solid", "contrast"] as const)("%s: opaque, flat, the edge kept", (mode) => {
  const face = headerGlass(mode) as Face;
  expect(face.backgroundColor).toBe(color.background);
  expect(face.borderColor).toBe(color.borderStrong);
  expect(face.boxShadow?.every((each) => each.inset)).toBe(true);
});

test.each(["glass", "solid", "contrast"] as const)(
  "the bell wears the circle of glass (%s)",
  async (mode: GlassMode) => {
    glassMode.mockReturnValue(mode);
    await render(<BellButton />);
    const bell = flat(screen.getByTestId("bell").props.style);
    expect(bell.backgroundColor).toBe(headerGlass(mode).backgroundColor);
    expect(bell.boxShadow).toEqual(headerGlass(mode).boxShadow);
    expect(bell.backgroundColor).not.toBe(color.accent);
    // The red number stays on it.
    expect(screen.getByTestId("bell-count")).toBeOnTheScreen();
  },
);

test.each(["glass", "solid", "contrast"] as const)(
  "the sport button wears the same circle (%s)",
  async (mode: GlassMode) => {
    glassMode.mockReturnValue(mode);
    await render(<SportButton sports={SPORTS} />);
    const button = flat(screen.getByRole("button", { name: "Sport, Run" }).props.style);
    expect(button.backgroundColor).toBe(headerGlass(mode).backgroundColor);
    expect(button.borderColor).toBe(color.borderStrong);
    expect(button.boxShadow).toEqual(headerGlass(mode).boxShadow);
  },
);
