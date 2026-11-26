import drawings from "@shaperoute/shared-types/fixtures/drawings.json";
import myPost from "@shaperoute/shared-types/fixtures/my-plan-post.json";
import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import type { Drawing, DrawingsPage } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountOutcome } from "../api/accounts";
import { forgetFeedMaps } from "../feed/FeedMaps";
import { DrawingsContext, type DrawingsDoor } from "./drawingsDoor";
import { DrawingsGrid } from "./DrawingsGrid";
import { PLAN_GRID_TILE_TEST_ID } from "./PlanGridTile";

// A gym plan posted in the grid of a profile (TASK-485 part C): it has no
// line, so its cell shows «Workout plan», the plan's name and its week; a
// tap opens it as any drawing.

const [HEART] = drawings.drawings as Drawing[];
const ID = publicProfile.public_id;
/** The tile is hidden from a screen reader: found only when asked so. */
const HIDDEN = { includeHiddenElements: true };

/** A plan posted as GET /users/{id}/drawings answers it. */
function planPost(): Drawing {
  return {
    ...structuredClone(HEART),
    id: myPost.id,
    title: null,
    description: myPost.description,
    distance_m: 0,
    duration_s: 0,
    track_preview: [],
    photos: [],
    source: "plan",
    plan: structuredClone(myPost.plan),
  } as unknown as Drawing;
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
});

test("the cell of a plan posted shows its name and week; a tap opens it", async () => {
  const post = planPost();
  const { value, open } = door([post, HEART]);
  await render(
    <DrawingsContext.Provider value={value}>
      <DrawingsGrid publicId={ID} own={false} />
    </DrawingsContext.Provider>,
  );
  const cells = await screen.findAllByTestId("drawing-cell");
  expect(cells).toHaveLength(2);
  // One tile, in the cell of the plan only.
  expect(screen.getAllByTestId(PLAN_GRID_TILE_TEST_ID, HIDDEN)).toHaveLength(1);
  expect(screen.getByText("Workout plan", HIDDEN)).toBeTruthy();
  expect(screen.getByText("Lift and run", HIDDEN)).toBeTruthy();
  // Monday at the gym; Tuesday, Thursday and Saturday runs; three rest days.
  expect(screen.getAllByTestId("plan-grid-gym", HIDDEN)).toHaveLength(1);
  expect(screen.getAllByTestId("plan-grid-out", HIDDEN)).toHaveLength(3);
  expect(screen.getAllByTestId("plan-grid-rest", HIDDEN)).toHaveLength(3);
  await fireEvent.press(cells[0]);
  expect(open).toHaveBeenCalledWith(post);
});

test("a plan posted that cannot be read keeps the cell of before", async () => {
  const post = { ...planPost(), plan: { name: 3 } } as unknown as Drawing;
  const { value } = door([post]);
  await render(
    <DrawingsContext.Provider value={value}>
      <DrawingsGrid publicId={ID} own={false} />
    </DrawingsContext.Provider>,
  );
  await screen.findAllByTestId("drawing-cell");
  expect(screen.queryByTestId(PLAN_GRID_TILE_TEST_ID, HIDDEN)).toBeNull();
});
