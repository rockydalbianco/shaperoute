import activity from "@shaperoute/shared-types/fixtures/activity.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import type { ActivityDetail } from "../api/activities";
import { MessagesContext, type MessagesDoor } from "../messages/messagesDoor";
import { ActivityCard } from "./ActivityCard";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: jest.requireActual("../messages/dismissingModal").default,
}));
// Who to send it to is tested where it lives: here, a sheet that closes.
jest.mock("../messages/SendToFriend", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    SendToFriend: ({ onClose }: { onClose: () => void }) => (
      <Pressable onPress={onClose} accessibilityRole="button">
        <Text>Close send to</Text>
      </Pressable>
    ),
  };
});

// «Send to a friend» in the «…» of a run of «My activities» (TASK-456):
// once «Send to…» is closed the «…» sheet it was opened from is closed too.
// It used to stay open under it (closed with TASK-455 part B).

const signedIn: AccountState = { status: "signedIn", session: session as Session };
const RUN = activity as unknown as ActivityDetail;

const door: MessagesDoor = {
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

test("closing «Send to…» closes the «…» sheet it was opened from", async () => {
  await render(
    <MessagesContext.Provider value={door}>
      <ActivityCard activity={RUN} onDelete={jest.fn()} />
    </MessagesContext.Provider>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "More" }));
  // The sheet is open: its rows are there.
  expect(screen.getByRole("button", { name: "Delete" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Send to a friend" }));
  await fireEvent.press(screen.getByRole("button", { name: "Close send to" }));
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull(),
  );
  expect(screen.queryByRole("button", { name: "Close send to" })).toBeNull();
  // And «…» opens it again, as new.
  await fireEvent.press(screen.getByRole("button", { name: "More" }));
  expect(screen.getByRole("button", { name: "Send to a friend" })).toBeOnTheScreen();
});
