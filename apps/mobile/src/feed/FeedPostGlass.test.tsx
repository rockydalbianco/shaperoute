import feed from "@shaperoute/shared-types/fixtures/feed.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPost as Post, Session } from "@shaperoute/shared-types";
import { render, screen, within } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";

import type { AccountState } from "../account/useAccount";
import { segmentTrackFace } from "../screens/Segmented";
import { forgetBlocked } from "../social/blockedNow";
import { FollowsContext } from "../social/followsDoor";
import { BRIGHTNESS_STEPS, DEFAULT_TONE, TONES } from "../theme/tone";
import { color, glassOf, paletteOf, radius, space } from "../theme/tokens";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";
import { FeedPost } from "./FeedPost";
import { forgetFeedMaps } from "./FeedMaps";
import { shownPost } from "./feedPosts";

// The cards of «Feed» in the glass look (TASK-469 A4c, ADR-0383,
// «Capsula»): the card's radius, the words over a photo on a capsule of glass
// laid inside it (before, light words on `Scrim`), the page counter as a
// capsule of glass. «Reduce Transparency» and «Increase Contrast» make the
// capsule opaque.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../ui/useGlassMode", () => ({
  ...jest.requireActual("../ui/useGlassMode"),
  useGlassMode: jest.fn(),
}));
const glassMode = jest.mocked(useGlassMode);

const URL = "http://api";
const WIDTH = 358;
const signedIn: AccountState = { status: "signedIn", session: session as Session };
// The fixture's first post has one photo.
const WITH_PHOTO = feed.posts[0] as Post;
const hidden = { includeHiddenElements: true };

type Face = ViewStyle & { boxShadow?: unknown };

async function show(mode: GlassMode) {
  glassMode.mockReturnValue(mode);
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <FeedPost post={shownPost(WITH_PHOTO)} width={WIDTH} onOpen={jest.fn()} />
    </FollowsContext.Provider>,
  );
}

function styleOf(testID: string): Face {
  return StyleSheet.flatten(screen.getByTestId(testID, hidden).props.style) as Face;
}

beforeEach(() => {
  forgetFeedMaps();
  forgetBlocked();
});

test("the card has the glass look's radius, 28", async () => {
  await show("glass");
  expect(styleOf("feed-post").borderRadius).toBe(radius.card);
});

test.each(["glass", "solid", "contrast"] as const)(
  "over a photo the words lie on a capsule of glass 8 pt inside it (%s)",
  async (mode) => {
    await show(mode);
    const capsule = styleOf("feed-photo-words");
    expect(capsule).toMatchObject({
      position: "absolute",
      left: space.sm,
      right: space.sm,
      bottom: space.sm,
      borderRadius: radius.pill,
    });
    expect(capsule.backgroundColor).toBe(segmentTrackFace(mode).backgroundColor);
    expect(capsule.boxShadow).toEqual(segmentTrackFace(mode).boxShadow);
    const words = screen.getByTestId("feed-photo-words", hidden);
    const title = shownPost(WITH_PHOTO).title;
    expect(within(words).getByText(title, hidden)).toHaveStyle({ color: color.text });
  },
);

test("«Reduce Transparency»: the capsule is the opaque background", async () => {
  await show("solid");
  expect(styleOf("feed-photo-words").backgroundColor).toBe(color.background);
});

test("the capsule and the counter are never yellow", async () => {
  await show("glass");
  expect(styleOf("feed-photo-words").backgroundColor).not.toBe(color.accent);
});

// The calories keep their colour on the glass: 4.5:1 over a white or a
// black photo, in every tone, at every step.
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
function over(fill: string, under: string): string {
  const alpha = parseInt(fill.slice(7, 9), 16) / 255;
  const channel = (at: number) =>
    Math.round(
      parseInt(fill.slice(at, at + 2), 16) * alpha +
        parseInt(under.slice(at, at + 2), 16) * (1 - alpha),
    )
      .toString(16)
      .padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

const EVERY = TONES.flatMap((tone) =>
  Array.from(
    { length: BRIGHTNESS_STEPS },
    (_, step) => [tone, step, { ...DEFAULT_TONE, tone, [tone]: step }] as const,
  ),
);

test.each(EVERY)(
  "%s at step %d: the calories keep 4.5:1 on the capsule over any photo",
  (_tone, _step, choice) => {
    const palette = paletteOf(choice);
    const fill = glassOf(choice).fill;
    for (const photo of ["#FFFFFF", "#000000"]) {
      expect(contrast(palette.energy, over(fill, photo))).toBeGreaterThanOrEqual(4.5);
    }
  },
);
