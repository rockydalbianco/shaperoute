import drawingDetailsPhotos from "@shaperoute/shared-types/fixtures/drawing-details-photos.json";
import myPost from "@shaperoute/shared-types/fixtures/my-plan-post.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { DrawingDetail, GymPlanPosted, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { isDrawingDetail } from "../api/drawings";
import { MessagesContext, type MessagesDoor } from "../messages/messagesDoor";
import { DrawingCard } from "./DrawingCard";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// A gym plan posted, opened from a profile, the bell, a push, the post's
// link or a chat (TASK-485 part C): all of them open it by its id, on the
// map with this card. Its tile as in the Feed, the plan whole when tapped,
// «Use this plan» on somebody else's; nothing of a run.

const signedIn: AccountState = { status: "signedIn", session: session as Session };
const ME = (session as Session).user.public_id ?? "";
const ADAM = {
  public_id: "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44",
  username: "adam.trento",
};

function door(): MessagesDoor {
  return {
    apiUrl: "http://api",
    account: { state: signedIn, sessionEnded: jest.fn() },
    screen: null,
    openList: jest.fn(),
    openConversation: jest.fn(),
    back: jest.fn(),
    close: jest.fn(),
    unread: { unread: 0, requests: 0 },
    recount: jest.fn(),
  };
}

/** A plan posted as GET /drawings/{id} answers it to an app that says
 * `plans`: no activity, no line. */
function examplePost(author = ADAM): DrawingDetail {
  const read: unknown = {
    ...structuredClone(drawingDetailsPhotos),
    id: myPost.id,
    author: { ...structuredClone(drawingDetailsPhotos.author), ...author },
    title: null,
    description: myPost.description,
    activity: null,
    distance_m: 0,
    duration_s: 0,
    track: [],
    photos: [],
    source: "plan",
    plan: structuredClone(myPost.plan) as GymPlanPosted,
  };
  if (!isDrawingDetail(read)) {
    throw new Error("the example post is not read");
  }
  return read;
}

async function show(drawing: DrawingDetail) {
  await render(
    <MessagesContext.Provider value={door()}>
      <DrawingCard
        drawing={drawing}
        onBack={jest.fn()}
        onStart={jest.fn()}
        onDrawAgain={jest.fn()}
        onEditDrawing={jest.fn()}
      />
    </MessagesContext.Provider>,
  );
  // The tile takes the card's width once it is laid out.
  await fireEvent(screen.getByTestId("drawing-plan"), "layout", {
    nativeEvent: { layout: { width: 358, height: 0, x: 0, y: 0 } },
  });
}

test("the card of a plan posted shows its tile, and no run's buttons", async () => {
  await show(examplePost());
  const tile = screen.getByTestId("plan-tile");
  expect(within(tile).getByText("WORKOUT PLAN")).toBeOnTheScreen();
  expect(within(tile).getByText("Lift and run · Get back in shape")).toBeOnTheScreen();
  expect(within(tile).getByText("4 days a week · 4 weeks")).toBeOnTheScreen();
  // The author's line once, in the tile.
  expect(screen.getAllByText(myPost.description)).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Use this plan" })).toBeOnTheScreen();
  expect(screen.queryByTestId("imported-mark")).toBeNull();
  // No run's distance (the author's line may say «10 km»).
  expect(screen.queryByText(/^0(\.0)? (km|mi)$/)).toBeNull();
  expect(screen.queryByText(/ · 0(\.0)? (km|mi)$/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Send to a friend" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Export GPX" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Draw it near me" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Edit the drawing" })).toBeNull();
  // Its reactions and «Back to the profile» stay.
  expect(screen.getByRole("button", { name: "Back to the profile" })).toBeOnTheScreen();
});

test("tapped, the plan opens whole, as in the Feed", async () => {
  await show(examplePost());
  await fireEvent.press(screen.getByTestId("plan-tile-open"));
  const page = screen.getByTestId("plan-detail");
  expect(within(page).getByText("Tue — Easy run · 5 km")).toBeOnTheScreen();
  expect(within(page).getByTestId("plan-detail-use")).toBeOnTheScreen();
});

test("one's own plan posted: no «Use this plan»", async () => {
  await show(examplePost({ public_id: ME, username: "me" }));
  expect(screen.getByTestId("plan-tile")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Use this plan" })).toBeNull();
});
