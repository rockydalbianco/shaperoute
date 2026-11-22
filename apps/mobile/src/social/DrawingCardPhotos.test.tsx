import drawingDetailsPhotos from "@shaperoute/shared-types/fixtures/drawing-details-photos.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { DrawingDetail, Session } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { isDrawingDetail } from "../api/drawings";
import { MessagesContext, type MessagesDoor } from "../messages/messagesDoor";
import { DrawingCard } from "./DrawingCard";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// A post of photos only opened from a profile, the bell or a push
// (TASK-312 part C2): the card over the map, without a run. Its photos and
// «Imported», no numbers, nothing to run, export or send in a chat.

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

function examplePost(): DrawingDetail {
  const read = structuredClone(drawingDetailsPhotos);
  if (!isDrawingDetail(read)) {
    throw new Error("the example post is not read");
  }
  return read;
}

test("the card of a post of photos only has «Imported», and no run's buttons", async () => {
  await render(
    <MessagesContext.Provider value={door()}>
      <DrawingCard drawing={examplePost()} onBack={jest.fn()} onStart={jest.fn()} />
    </MessagesContext.Provider>,
  );
  expect(screen.getByText("Lake morning")).toBeTruthy();
  expect(screen.getByTestId("imported-mark")).toBeTruthy();
  expect(screen.queryByText(/km|mi\b/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Send to a friend" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Export GPX" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Draw it near me" })).toBeNull();
});
