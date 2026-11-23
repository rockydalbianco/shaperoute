import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";

import { PlayTabs } from "../game/PlayTabs";
import { color, glass, glassOf, paletteOf } from "../theme/tokens";
import { DEFAULT_TONE } from "../theme/tone";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";
import { Segmented, segmentPillFace, segmentTrackFace } from "./Segmented";

// The choices on glass (TASK-469 A3, ADR-0383, the look «Capsula»): the
// track is a capsule of glass laid in the page, the pill under the choice
// stands out of it. «Reduce Transparency» and «Increase Contrast» make it
// opaque, as the tab bar.

jest.mock("../haptics/haptics", () => ({ selectionFeel: jest.fn() }));
jest.mock("../ui/useGlassMode", () => ({
  ...jest.requireActual("../ui/useGlassMode"),
  useGlassMode: jest.fn(),
}));
const glassMode = jest.mocked(useGlassMode);

type Shadow = {
  inset?: boolean;
  offsetY?: number;
  blurRadius?: number;
  color?: string;
};
type Face = ViewStyle & { boxShadow?: Shadow[] };

const OPTIONS = [
  { value: "shape", label: "Shape" },
  { value: "word", label: "Word" },
] as const;

function styleOf(testID: string): Face {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as Face;
}

async function measure(testID: string) {
  await act(async () => {
    fireEvent(screen.getByTestId(testID), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 52 } },
    });
  });
}

async function segmented(mode: GlassMode) {
  glassMode.mockReturnValue(mode);
  await render(<Segmented options={OPTIONS} value="word" onChange={jest.fn()} />);
  await measure("segmented");
}

async function play(mode: GlassMode) {
  glassMode.mockReturnValue(mode);
  await render(<PlayTabs options={OPTIONS} value="word" onChange={jest.fn()} />);
  await measure("play-tabs");
}

test("on glass the track is the veiled background with its rim and light, casting no shadow", async () => {
  await segmented("glass");
  const track = styleOf("segmented");
  expect(track.backgroundColor).toBe(glass.fill);
  const shadows = track.boxShadow ?? [];
  expect(shadows.every((each) => each.inset)).toBe(true);
  expect(shadows.map((each) => each.color)).toEqual([glass.rim, glass.rimTop]);
});

test("on glass the pill stands out: light on top, a short shadow, the strong edge kept", async () => {
  await segmented("glass");
  const pill = styleOf("segment-pill");
  expect(pill.backgroundColor).toBe(color.surfaceRaised);
  expect(pill.borderColor).toBe(color.borderStrong);
  const cast = pill.boxShadow?.find((each) => !each.inset);
  expect(cast?.color).toBe(glass.shadow);
  expect(cast?.blurRadius).toBeLessThanOrEqual(8);
  expect(pill.boxShadow?.find((each) => each.inset)?.color).toBe(glass.rimTop);
});

test("«Reduce Transparency»: the track is the opaque background, the pill flat", async () => {
  await segmented("solid");
  const track = styleOf("segmented");
  expect(track.backgroundColor).toBe(color.background);
  expect(track.boxShadow?.[0]?.color).toBe(color.border);
  expect(styleOf("segment-pill").boxShadow).toBeUndefined();
});

test("«Increase Contrast»: opaque, with the strong edge", async () => {
  await segmented("contrast");
  const track = styleOf("segmented");
  expect(track.backgroundColor).toBe(color.background);
  expect(track.boxShadow?.[0]?.color).toBe(color.borderStrong);
});

test("a caller's own background still wins over the glass", async () => {
  glassMode.mockReturnValue("glass");
  await render(
    <Segmented
      options={OPTIONS}
      value="word"
      onChange={jest.fn()}
      style={{ backgroundColor: color.surface }}
    />,
  );
  expect(styleOf("segmented").backgroundColor).toBe(color.surface);
  expect(styleOf("segmented").boxShadow).toBeDefined();
});

test("before the track is measured the chosen one wears the same raised pill", async () => {
  glassMode.mockReturnValue("glass");
  await render(<Segmented options={OPTIONS} value="word" onChange={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Word", selected: true })).toHaveStyle({
    backgroundColor: color.surfaceRaised,
    borderColor: color.borderStrong,
  });
});

test.each(["glass", "solid", "contrast"] as const)(
  "«Play» wears the same track and pill as the other choices (%s)",
  async (mode) => {
    await play(mode);
    expect(styleOf("play-tabs").backgroundColor).toBe(
      segmentTrackFace(mode).backgroundColor,
    );
    expect(styleOf("play-tabs").boxShadow).toEqual(segmentTrackFace(mode).boxShadow);
    expect(styleOf("play-tabs-pill").boxShadow).toEqual(
      segmentPillFace(mode).boxShadow,
    );
    expect(styleOf("play-tabs-pill").backgroundColor).toBe(color.surfaceRaised);
  },
);

test("in the light tone the faces come from the light palette and glass, never yellow", () => {
  const choice = { ...DEFAULT_TONE, tone: "light" as const };
  const palette = paletteOf(choice);
  const colors = glassOf(choice);
  const track = segmentTrackFace("glass", colors, palette);
  const pill = segmentPillFace("glass", colors, palette);
  expect(track.backgroundColor).toBe(colors.fill);
  expect(pill.backgroundColor).toBe(palette.surfaceRaised);
  for (const value of [track.backgroundColor, pill.backgroundColor, pill.borderColor]) {
    expect(String(value).slice(0, 7).toUpperCase()).not.toBe(
      palette.accent.toUpperCase(),
    );
  }
});
