import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session, User } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";

import { apiError } from "../account/testing";
import type { AccountState } from "../account/useAccount";
import { SLEEP_CHOICE_FILE } from "../health/sleepChoice";
import { fakeSleepReader, without } from "../health/sleepEnd.testing";
import { sleepPostsOn, sleepReader } from "../health/sleepModules";
import type { SleepSample } from "../health/sleepNight";
import { FollowsContext } from "../social/followsDoor";
import { OWN_SLEEP_TEST_ID } from "./OwnSleep";
import { ProfileHome } from "./ProfileHome";

// The «Sleep» card on one's own «Profile» (TASK-467 part B3), and the
// Coordinatore's condition: while the sleep is off, as in every build until
// part C, the page is drawn exactly as before and nothing about the sleep
// is read or asked. Here the phone even has a reader and the yes is kept,
// which no build has: the switch alone must hide it all.

jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => false),
  sleepReader: jest.fn(() => null),
}));

// The phone's documents folder, in memory.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const on = jest.mocked(sleepPostsOn);
const URL = "http://api";
const ID = publicProfile.public_id;
const signedIn: AccountState = { status: "signedIn", session: session as Session };

/** Asleep from 23:00 last evening for 7 h 30 min, on the phone's clock. */
function lastNight(): SleepSample[] {
  const now = new Date();
  const fromMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
    23,
  ).getTime();
  return [{ fromMs, toMs: fromMs + 450 * 60_000, stage: "asleep" }];
}

const phone = fakeSleepReader({ samples: jest.fn(async () => lastNight()) });

/** The API of the profile; no night shared. What was asked comes back. */
function api(): jest.SpyInstance {
  return jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (url: string | URL | Request) => {
      if (String(url) === `${URL}/users/${ID}`) {
        return Response.json(publicProfile);
      }
      if (String(url).endsWith("/sleep")) {
        return Response.json(apiError("http_error"), { status: 404 });
      }
      return Response.json({ people: [], next: null, total: 0 });
    });
}

async function show() {
  const shown = await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <ProfileHome
        user={session.user as User}
        favorites={2}
        activities={5}
        onOpen={jest.fn()}
        onEdit={jest.fn()}
      />
    </FollowsContext.Provider>,
  );
  // The profile, the lists and the night answer.
  await act(async () => {});
  await act(async () => {});
  return shown;
}

beforeEach(() => {
  files.clear();
  files.set(`file:///documents/${SLEEP_CHOICE_FILE}`, '{"on":true}');
  jest.mocked(sleepReader).mockReturnValue(phone);
  jest.mocked(phone.samples).mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("off: no card, the sleep is not read, the API is asked nothing about it", async () => {
  on.mockReturnValue(false);
  const fetched = api();
  await show();
  expect(screen.queryByTestId(OWN_SLEEP_TEST_ID)).toBeNull();
  expect(screen.queryByText("Sleep score")).toBeNull();
  expect(screen.queryByText("Show my sleep from Apple Health")).toBeNull();
  expect(phone.ask).not.toHaveBeenCalled();
  expect(phone.samples).not.toHaveBeenCalled();
  const asked = fetched.mock.calls.map(([url]) => String(url));
  expect(asked.length).toBeGreaterThan(0);
  expect(asked.filter((url) => /sleep/.test(url))).toEqual([]);
});

test("off, the page is drawn exactly as before: on, only the card is added", async () => {
  on.mockReturnValue(false);
  api();
  const off = await show();
  const before = off.toJSON();
  off.unmount();

  on.mockReturnValue(true);
  await show();
  expect(await screen.findByTestId(OWN_SLEEP_TEST_ID)).toBeOnTheScreen();
  expect(screen.getByText("Only you see this")).toBeOnTheScreen();
  // Nothing but the card moved: off, there is nothing to take away.
  expect(without(screen.toJSON(), OWN_SLEEP_TEST_ID)).toEqual(
    without(before, OWN_SLEEP_TEST_ID),
  );
  expect(without(before, OWN_SLEEP_TEST_ID)).toEqual(without(before, "none"));
});

test("without a reader, as every build until part C, the switch alone shows nothing", async () => {
  on.mockReturnValue(true);
  jest.mocked(sleepReader).mockReturnValue(null);
  const fetched = api();
  await show();
  expect(screen.queryByTestId(OWN_SLEEP_TEST_ID)).toBeNull();
  const asked = fetched.mock.calls.map(([url]) => String(url));
  expect(asked.filter((url) => /sleep/.test(url))).toEqual([]);
});
