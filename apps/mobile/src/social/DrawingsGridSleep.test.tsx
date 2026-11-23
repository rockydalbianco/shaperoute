import drawings from "@shaperoute/shared-types/fixtures/drawings.json";
import feedSleep from "@shaperoute/shared-types/fixtures/feed-sleep.json";
import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import type { Drawing, DrawingsPage } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountOutcome } from "../api/accounts";
import { forgetFeedMaps } from "../feed/FeedMaps";
import { sleepPostsOn } from "../health/sleepModules";
import { DrawingsContext, type DrawingsDoor } from "./drawingsDoor";
import { DrawingsGrid } from "./DrawingsGrid";

// The post of a night of sleep in the grid of a profile (TASK-467 part E):
// it has no line, so its cell shows MuW's score; a tap opens it as any
// drawing.

jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => true),
}));

const [HEART] = drawings.drawings as Drawing[];
const ID = publicProfile.public_id;
/** The tile is hidden from a screen reader: found only when asked so. */
const HIDDEN = { includeHiddenElements: true };

/** The post of a night as GET /users/{id}/drawings answers it, read. */
function night(): Drawing {
  const {
    activity: _none,
    author: _who,
    ...post
  } = structuredClone(feedSleep.posts[0]);
  return post as unknown as Drawing;
}

function door(list: Drawing[]) {
  const answer: AccountOutcome<DrawingsPage> = {
    kind: "ok",
    value: { drawings: list, next: null, total: list.length },
  };
  const open = jest.fn();
  const value: DrawingsDoor = {
    publicKeys: new Set(),
    refreshMine: () => {},
    choiceOf: async () => null,
    choose: async () => null,
    photosOf: () => [],
    keepPhotoOf: () => false,
    removePhotoOf: () => {},
    orderOf: () => null,
    keepOrderOf: () => false,
    photoSource: () => null,
    pageOf: jest.fn(async () => answer),
    opening: null,
    openProblem: null,
    open,
    opened: null,
    back: () => {},
    leave: () => {},
  };
  return { value, open };
}

beforeEach(() => {
  forgetFeedMaps();
  jest.mocked(sleepPostsOn).mockReturnValue(true);
});

test("the cell of the post of a night shows its score; a tap opens it", async () => {
  const post = night();
  const { value, open } = door([post, HEART]);
  await render(
    <DrawingsContext.Provider value={value}>
      <DrawingsGrid publicId={ID} own={false} />
    </DrawingsContext.Provider>,
  );
  const cells = await screen.findAllByTestId("drawing-cell");
  expect(cells).toHaveLength(2);
  // One tile, in the cell of the night only.
  expect(screen.getAllByTestId("sleep-tile", HIDDEN)).toHaveLength(1);
  expect(screen.getByText("82", HIDDEN)).toBeTruthy();
  await fireEvent.press(cells[0]);
  expect(open).toHaveBeenCalledWith(post);
});
