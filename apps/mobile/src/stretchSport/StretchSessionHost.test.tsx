/**
 * A stretching session of the sport «Stretching» (TASK-475 part B,
 * ADR-0386): «Start stretching» opens the routine ticked on «Draw», which
 * asks how long; at its end the session is kept on the phone and sent to
 * the API, PUT /me/stretch-sessions/{key}; with no network it waits, and
 * one left at once keeps nothing.
 */
import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { answers } from "../account/testing";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { category, compose } from "../stretch/compose";
import { routineExercises } from "../stretch/routines";
import { READY_S, SWITCH_S, TICK_MS } from "../stretch/StretchScreen";
import { chooseRoutine, FIRST_ROUTINE } from "./stretchChoice";
import { loadStretchOutbox, STRETCH_OUTBOX_FILE, stretchToSend } from "./stretchOutbox";
import {
  startCategorySession,
  startStretchSession,
  StretchSessionHost,
} from "./StretchSessionHost";

jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));
jest.mock("../stretch/chime", () => ({ chime: () => {}, tick: () => {} }));
jest.mock("../intro/SavedLogo", () => ({
  ...jest.requireActual("../intro/SavedLogo"),
  showSavedLogo: jest.fn(),
}));
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
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const { showSavedLogo } = jest.requireMock<{ showSavedLogo: jest.Mock }>(
  "../intro/SavedLogo",
);
const signedIn = session as Session;
const OWNER = signedIn.user.id;
const T0 = Date.UTC(2026, 10, 21, 7);

function follows(): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: { status: "signedIn", session: signedIn },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

const refresh = jest.fn();

function activities(): ActivitiesDoor {
  return {
    signedIn: true,
    owner: OWNER,
    refresh,
    signIn: jest.fn(),
  } as unknown as ActivitiesDoor;
}

async function show(fetchFn: jest.Mock) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <ActivitiesContext.Provider value={activities()}>
        <StretchSessionHost fetchFn={fetchFn} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
}

function wait(ms: number) {
  return act(() => jest.advanceTimersByTimeAsync(ms));
}

function press(name: string) {
  return act(async () => {
    fireEvent.press(screen.getByRole("button", { name }));
  });
}

/** The seconds of the routine `key` of 3 minutes, to its end. */
function wholeSeconds(): number {
  return routineExercises("afterGym", 3).reduce(
    (sum, exercise) =>
      sum +
      READY_S +
      exercise.seconds +
      (exercise.sides ? SWITCH_S + exercise.seconds : 0),
    0,
  );
}

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  files.clear();
  refresh.mockClear();
  showSavedLogo.mockClear();
  chooseRoutine(FIRST_ROUTINE);
  jest
    .spyOn(AccessibilityInfo, "announceForAccessibility")
    .mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("nothing shows until «Start stretching»", async () => {
  await show(answers());
  expect(screen.queryByTestId("stretch-chooser")).toBeNull();
});

test("the routine ticked on «Draw» is done, kept and sent to the API", async () => {
  const saved = {
    id: "k",
    started_at: new Date(T0).toISOString(),
    duration_s: 1,
    routine: "afterGym",
    minutes: 3,
    exercises: 1,
  };
  const fetchFn = answers({ status: 201, body: saved });
  await show(fetchFn);
  chooseRoutine("afterGym");
  await act(async () => startStretchSession());
  expect(screen.getByTestId("stretch-chooser")).toBeOnTheScreen();
  expect(screen.getByText("After gym")).toBeOnTheScreen();
  await press("3 min");
  await wait(wholeSeconds() * TICK_MS);
  // Done: the screen is gone, the logo says it, the API has it.
  expect(screen.queryByTestId("stretch-screen")).toBeNull();
  expect(showSavedLogo).toHaveBeenCalledTimes(1);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toMatch(/^http:\/\/api\/me\/stretch-sessions\/[a-z0-9]{8,40}$/);
  expect(init?.method).toBe("PUT");
  const body = JSON.parse(init?.body as string);
  expect(body).toMatchObject({
    started_at: new Date(T0).toISOString(),
    routine: "afterGym",
    minutes: 3,
    exercises: routineExercises("afterGym", 3).length,
    pauses: [],
  });
  expect(Date.parse(body.ended_at) - T0).toBe(wholeSeconds() * TICK_MS);
  // Sent: nothing waits, «My activities» asks again.
  expect(loadStretchOutbox()).toEqual([]);
  expect(refresh).toHaveBeenCalled();
});

test("with no network the session waits on the phone, to go later", async () => {
  const fetchFn = jest.fn(() => Promise.reject(new Error("offline")));
  await show(fetchFn);
  await act(async () => startStretchSession("morning"));
  await press("3 min");
  // One exercise held to its end, then «End».
  const first = routineExercises("morning", 3)[0];
  await wait(
    (READY_S + first.seconds + (first.sides ? SWITCH_S + first.seconds : 0)) * TICK_MS,
  );
  await press("End");
  expect(showSavedLogo).toHaveBeenCalledTimes(1);
  const waiting = stretchToSend(OWNER);
  expect(waiting).toHaveLength(1);
  expect(waiting[0].request).toMatchObject({ routine: "morning", exercises: 1 });
  expect(files.has(`file:///documents/${STRETCH_OUTBOX_FILE}`)).toBe(true);
});

test("a session left before any exercise ends keeps nothing", async () => {
  const fetchFn = answers();
  await show(fetchFn);
  await act(async () => startStretchSession());
  await press("3 min");
  await press("End");
  expect(screen.queryByTestId("stretch-screen")).toBeNull();
  expect(showSavedLogo).not.toHaveBeenCalled();
  expect(loadStretchOutbox()).toEqual([]);
  expect(fetchFn).not.toHaveBeenCalled();
});

test("a routine composed from a category starts at once and is kept under the category's key", async () => {
  // «Start» on the stretching home (TASK-520): no length to ask.
  const neck = compose(category("neck"), { minutes: 3, level: "gentle", where: "any" });
  const fetchFn = answers({ status: 201, body: {} });
  await show(fetchFn);
  await act(async () =>
    startCategorySession("neck", neck.choice.minutes, neck.exercises),
  );
  expect(screen.queryByTestId("stretch-chooser")).toBeNull();
  expect(screen.getByTestId("stretch-screen")).toBeOnTheScreen();
  expect(screen.getByText(neck.exercises[0].name)).toBeOnTheScreen();
  await wait(neck.seconds * TICK_MS);
  expect(screen.queryByTestId("stretch-screen")).toBeNull();
  expect(showSavedLogo).toHaveBeenCalledTimes(1);
  const [, init] = fetchFn.mock.calls[0];
  expect(JSON.parse(init?.body as string)).toMatchObject({
    routine: "neck",
    minutes: 3,
    exercises: neck.exercises.length,
  });
});

test("a session on is not replaced by another «Start»", async () => {
  const neck = compose(category("neck"), { minutes: 3, level: "gentle", where: "any" });
  await show(answers());
  await act(async () => startCategorySession("neck", 3, neck.exercises));
  await act(async () => startStretchSession("morning"));
  expect(screen.queryByTestId("stretch-chooser")).toBeNull();
  expect(screen.getByText(neck.exercises[0].name)).toBeOnTheScreen();
});
