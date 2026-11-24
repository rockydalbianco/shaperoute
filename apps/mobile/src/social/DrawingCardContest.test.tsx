/**
 * «Enter “{theme}”» on a drawing opened whole (TASK-343 part B, point 2):
 * `DrawingCard` mounts `EnterOnPost`, so one's own post published during the
 * challenge enters and withdraws from its own page; any other post, and an
 * API without themes, show nothing new. What the switch does is proved in
 * `contest/EnterOnPost.test.tsx`; here only that the card shows it.
 */
import open from "@shaperoute/shared-types/fixtures/contest.json";
import drawing from "@shaperoute/shared-types/fixtures/drawing.json";
import themedFixture from "@shaperoute/shared-types/fixtures/contest-themed.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type {
  Contest,
  DrawingDetail,
  Session,
  ThemedContest,
} from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { forgetContest, setContest } from "../contest/contestKept";
import { DrawingCard } from "./DrawingCard";
import { FollowsContext } from "./followsDoor";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const API = "http://api";
const SESSION = session as Session;
const ACCOUNT = SESSION.user.public_id ?? "";
const THEMED: ThemedContest = {
  ...(themedFixture as unknown as ThemedContest),
  starts_at: "2020-01-01T00:00:00Z",
  ends_at: "2999-12-31T23:59:59Z",
  entered: [],
};
const OWN: DrawingDetail = {
  ...(drawing as DrawingDetail),
  id: "own-post",
  visibility: "everyone",
  source: "muw",
  published_at: "2500-01-01T00:00:00Z",
  author: { public_id: ACCOUNT, username: "me" },
} as DrawingDetail;
const NAME = `Enter “${THEMED.theme.en.title}”`;

let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  forgetContest();
  fetchSpy = jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => new Response(null, { status: 204 }));
});

afterEach(() => {
  fetchSpy.mockRestore();
  forgetContest();
});

async function show(of: DrawingDetail) {
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: API,
        account: {
          state: { status: "signedIn", session: SESSION },
          sessionEnded: () => {},
        },
        openProfile: () => {},
      }}
    >
      <DrawingCard drawing={of} onBack={jest.fn()} />
    </FollowsContext.Provider>,
  );
}

test("one's own post during the challenge enters from its own page", async () => {
  setContest({ account: ACCOUNT, contest: THEMED });
  await show(OWN);
  await fireEvent.press(screen.getByRole("switch", { name: NAME }));
  await waitFor(() =>
    expect(
      screen.getByRole("switch", { name: NAME }).props.accessibilityState.checked,
    ).toBe(true),
  );
  const entry = fetchSpy.mock.calls.find(([url]) =>
    String(url).endsWith(`/contests/${THEMED.id}/entries/own-post`),
  );
  expect(entry?.[1]?.method).toBe("PUT");
  // Still the card: «Back to the profile» is there.
  expect(screen.getByRole("button", { name: "Back to the profile" })).toBeOnTheScreen();
});

test("somebody else's post has no switch", async () => {
  setContest({ account: ACCOUNT, contest: THEMED });
  await show({ ...OWN, author: { public_id: "other", username: "o" } });
  expect(screen.queryByRole("switch")).toBeNull();
});

test("with an API without themes the card is as before", async () => {
  setContest({ account: ACCOUNT, contest: open as Contest });
  await show(OWN);
  expect(screen.queryByRole("switch")).toBeNull();
  expect(screen.getByRole("button", { name: "Back to the profile" })).toBeOnTheScreen();
});
