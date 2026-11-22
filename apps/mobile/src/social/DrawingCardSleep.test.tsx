import drawingDetailsPhotos from "@shaperoute/shared-types/fixtures/drawing-details-photos.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";
import type { DrawingDetail, Session } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { isDrawingDetail } from "../api/drawings";
import { sleepPostsOn } from "../health/sleepModules";
import { MessagesContext, type MessagesDoor } from "../messages/messagesDoor";
import { DrawingCard } from "./DrawingCard";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => true),
}));

// The post of a night of sleep opened from a profile, the bell or a push
// (TASK-467 part E): the card over the map, without a run. Its night where
// a run has its numbers; nothing to run, export or send in a chat, and it
// is not «Imported».

const signedIn: AccountState = { status: "signedIn", session: session as Session };

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

/** The post of a night as GET /drawings/{id} answers it. */
function examplePost(): DrawingDetail {
  const read: unknown = {
    ...structuredClone(drawingDetailsPhotos),
    title: null,
    description: null,
    source: "sleep",
    photos: [],
    sleep: structuredClone(summary),
  };
  if (!isDrawingDetail(read)) {
    throw new Error("the example post is not read");
  }
  return read;
}

beforeEach(() => {
  jest.mocked(sleepPostsOn).mockReturnValue(true);
});

test("the card of the post of a night shows the night, and no run's buttons", async () => {
  await render(
    <MessagesContext.Provider value={door()}>
      <DrawingCard drawing={examplePost()} onBack={jest.fn()} onStart={jest.fn()} />
    </MessagesContext.Provider>,
  );
  expect(screen.getByTestId("sleep-post-card")).toBeTruthy();
  expect(screen.getByText("82 · Very good")).toBeTruthy();
  expect(screen.getByText("7 h 32 min")).toBeTruthy();
  expect(screen.queryByTestId("imported-mark")).toBeNull();
  expect(screen.queryByText(/km|mi\b/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Send to a friend" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Export GPX" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Draw it near me" })).toBeNull();
  // Never an hour of going to bed or of waking.
  expect(screen.queryByText(/\d{1,2}:\d{2}/)).toBeNull();
});
