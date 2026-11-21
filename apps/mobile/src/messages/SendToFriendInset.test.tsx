import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import type { AccountState } from "../account/useAccount";
import { space } from "../theme/tokens";
import { MessagesContext, type MessagesDoor } from "./messagesDoor";
import { SendToFriend } from "./SendToFriend";

// The phone's real edges, as the native module gives them at start. The
// real provider stays: it is what the page reads them from inside its Modal.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  initialWindowMetrics: {
    frame: { x: 0, y: 0, width: 420, height: 912 },
    insets: { top: 62, right: 0, bottom: 34, left: 0 },
  },
}));
jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: jest.requireActual("./dismissingModal").default,
}));

// «Send to…» opened from the sheet of «Share» under a post of «Feed»
// (TASK-455): there the app's edges are none, and its title and «Close» sat
// under the clock in the simulator. It takes its own, as the page of a post.

/** What the app's edges are where «Feed» draws its cards: none. */
const IN_THE_FEED = { top: 0, right: 0, bottom: 0, left: 0 };
const signedIn: AccountState = { status: "signedIn", session: session as Session };

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

/** The first top padding above the element, from its parents. */
function paddingAbove(element: ReturnType<typeof screen.getByText>) {
  let at = element.parent;
  while (at !== null) {
    const style = StyleSheet.flatten(at.props.style) as ViewStyle | undefined;
    if (typeof style?.paddingTop === "number") {
      return style.paddingTop;
    }
    at = at.parent;
  }
  return undefined;
}

test("«Send to…» is below the status bar wherever it is opened from", async () => {
  const fetchFn = jest.fn(async () =>
    Response.json({ conversations: [], people: [], next: null, total: 0 }),
  ) as unknown as typeof fetch;
  await render(
    <SafeAreaInsetsContext.Provider value={IN_THE_FEED}>
      <MessagesContext.Provider value={door}>
        <SendToFriend
          post={{
            id: "0b7e5a94-6c1d-4f38-8e2a-9d4c1f6b3a57",
            author: { public_id: "c2a9f4d1", username: "cleo" },
            everyone: true,
          }}
          onClose={jest.fn()}
          fetchFn={fetchFn}
          apiKey={null}
        />
      </MessagesContext.Provider>
    </SafeAreaInsetsContext.Provider>,
  );
  // Before, 0 + the gap: the title under the clock.
  expect(paddingAbove(await screen.findByText("Send to…"))).toBe(62 + space.md);
});
