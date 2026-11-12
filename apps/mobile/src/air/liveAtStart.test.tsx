/**
 * «Share live at start» (TASK-305 part R5b; the user's choice of 2026-11-12,
 * «Come l'ultima volta»): off until the pilot turns it on, then as it was
 * left; with it on, the link starts at the end of a flight's countdown and
 * the share sheet opens with it. Never for a run, never for a flight taken
 * up again, never without an account.
 */
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, render } from "@testing-library/react-native";

import type { RunPhase } from "../navigation/runControl";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import type { KeptList } from "../storage/keptList";
import { resetFlightNotice, showFlightNotice } from "./flightNotice";
import {
  liveAtStart,
  resetLiveAtStart,
  setLiveAtStart,
  useStartLiveAtStart,
} from "./liveAtStart";

jest.mock("expo-file-system", () => {
  class File {
    get exists(): boolean {
      return false;
    }
    create(): void {}
    write(): void {}
    textSync(): string {
      return "";
    }
    delete(): void {}
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

// The run's phase, moved by the test.
let mockPhase: RunPhase = "idle";
const mockListeners = new Set<() => void>();
jest.mock("../navigation/runControl", () => ({
  runControl: () => ({ phase: mockPhase }),
  subscribeRunControl: (listener: () => void) => {
    mockListeners.add(listener);
    return () => mockListeners.delete(listener);
  },
}));

async function moveTo(next: RunPhase) {
  await act(async () => {
    mockPhase = next;
    for (const listener of mockListeners) {
      listener();
    }
  });
}

function memory(): KeptList<string> & { list: string[] } {
  const kept = {
    list: [] as string[],
    load: () => [...kept.list],
    save: (list: string[]) => {
      kept.list = [...list];
      return true;
    },
  };
  return kept;
}

function follows(signedIn: boolean): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: signedIn
        ? { status: "signedIn", session: session as Session }
        : { status: "signedOut" },
      sessionEnded: () => {},
    },
  } as unknown as FollowsDoor;
}

const URL = "https://getmuw.app/live/abc";

async function screenOf(flight: boolean, signedIn = true) {
  const start = jest.fn(async () => ({ kind: "started" as const, url: URL }));
  const share = jest.fn();
  function Flight() {
    useStartLiveAtStart(flight, start, share);
    return null;
  }
  await render(
    <FollowsContext.Provider value={follows(signedIn)}>
      <Flight />
    </FollowsContext.Provider>,
  );
  return { start, share };
}

beforeEach(() => {
  mockPhase = "idle";
  mockListeners.clear();
  resetLiveAtStart();
  resetFlightNotice();
});

test("off until turned on, then as it was left", () => {
  const kept = memory();
  expect(liveAtStart(kept)).toBe(false);
  setLiveAtStart(true, kept);
  expect(kept.list).toEqual(["on"]);
  // At the next start of the app, the phone remembers.
  resetLiveAtStart();
  expect(liveAtStart(kept)).toBe(true);
  setLiveAtStart(false, kept);
  resetLiveAtStart();
  expect(liveAtStart(kept)).toBe(false);
});

test("on: the end of a flight's countdown starts the link and the share sheet", async () => {
  setLiveAtStart(true, memory());
  await moveTo("countdown");
  const { start, share } = await screenOf(true);
  expect(start).not.toHaveBeenCalled();
  await moveTo("running");
  expect(start).toHaveBeenCalledTimes(1);
  expect(start).toHaveBeenCalledWith(
    { baseUrl: "http://api", token: (session as Session).token },
    "paragliding",
  );
  expect(share).toHaveBeenCalledWith(expect.stringContaining(URL));
  // A pause and a resume start nothing more.
  await moveTo("paused");
  await moveTo("running");
  expect(start).toHaveBeenCalledTimes(1);
});

test("off, a run, a flight taken up again or no account: no link", async () => {
  await moveTo("countdown");
  const off = await screenOf(true);
  await moveTo("running");
  expect(off.start).not.toHaveBeenCalled();

  setLiveAtStart(true, memory());
  await moveTo("countdown");
  const run = await screenOf(false);
  await moveTo("running");
  expect(run.start).not.toHaveBeenCalled();

  // Taken up again: running from the first moment, with no countdown.
  const takenUp = await screenOf(true);
  await moveTo("paused");
  await moveTo("running");
  expect(takenUp.start).not.toHaveBeenCalled();

  await moveTo("countdown");
  const signedOut = await screenOf(true, false);
  await moveTo("running");
  expect(signedOut.start).not.toHaveBeenCalled();
});

test("a link that could not be made opens no share sheet", async () => {
  setLiveAtStart(true, memory());
  await moveTo("countdown");
  const start = jest.fn(async () => ({ kind: "failed" as const }));
  const share = jest.fn();
  function Flight() {
    useStartLiveAtStart(true, start, share);
    return null;
  }
  await render(
    <FollowsContext.Provider value={follows(true)}>
      <Flight />
    </FollowsContext.Provider>,
  );
  await moveTo("running");
  expect(start).toHaveBeenCalledTimes(1);
  expect(share).not.toHaveBeenCalled();
});

test("before the first flight, the share sheet waits for «Before you fly»", async () => {
  setLiveAtStart(true, memory());
  const show = jest.fn();
  const kept = { load: () => [] as string[], save: () => true };
  showFlightNotice(show, kept);
  await moveTo("countdown");
  const { start, share } = await screenOf(true);
  await moveTo("running");
  expect(start).toHaveBeenCalledTimes(1);
  expect(share).not.toHaveBeenCalled();
  await act(async () => show.mock.calls[0][2]());
  expect(share).toHaveBeenCalledWith(expect.stringContaining(URL));
});
