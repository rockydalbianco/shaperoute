import myDrawing from "@shaperoute/shared-types/fixtures/my-drawing.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import type { Account } from "../account/useAccount";
import { type DrawingChoice, NOT_CHOSEN } from "../api/drawings";
import { loadDrawingOutbox, sendWaitingDrawings } from "./drawingOutbox";
import { useDrawingsOf } from "./drawingsDoor";

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
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const URL = "http://api";
const signedIn = session as Session;
const OWNER = signedIn.user.id;
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });
const doors = { onOpened: jest.fn(), onBack: jest.fn() };

function account(over: Partial<Account> = {}): Account {
  return {
    state: { status: "signedIn", session: signedIn },
    busy: null,
    problem: null,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    editProfile: jest.fn(),
    changeEmail: jest.fn(),
    changePhone: jest.fn(),
    changeNotifications: jest.fn(),
    clearProblem: jest.fn(),
    sessionEnded: jest.fn(),
    ...over,
  };
}

const ON: DrawingChoice = { ...NOT_CHOSEN, title: "Heart", visibility: "everyone" };
const OFF: DrawingChoice = { ...NOT_CHOSEN, title: "Heart" };

beforeEach(() => {
  files.clear();
});

test("«Public» turned on without a network, then off with one: nothing waits to turn it on again", async () => {
  const fetchFn = answers(new Error("offline"), {
    status: 200,
    body: { ...myDrawing, public: false },
  });
  const { result: door } = await renderHook(() =>
    useDrawingsOf(URL, account(), doors, options(fetchFn)),
  );

  await act(async () => {
    expect(await door.current.choose("a", ON)).toEqual({ kind: "waiting" });
  });
  expect(loadDrawingOutbox()).toEqual([{ owner: OWNER, key: "a", ...ON }]);

  await act(async () => {
    expect(await door.current.choose("a", OFF)).toMatchObject({ kind: "saved" });
  });
  expect(loadDrawingOutbox()).toEqual([]);

  // The next round of what waits sends nothing for this run.
  const later = answers();
  expect(await sendWaitingDrawings(URL, signedIn.token, OWNER, options(later))).toBe(
    "done",
  );
  expect(later).not.toHaveBeenCalled();
});

test("a choice the API refuses takes the older one out of the file too", async () => {
  const fetchFn = answers(new Error("offline"), {
    status: 422,
    body: apiError("invalid_request"),
  });
  const { result: door } = await renderHook(() =>
    useDrawingsOf(URL, account(), doors, options(fetchFn)),
  );

  await act(async () => {
    await door.current.choose("a", ON);
  });
  await act(async () => {
    expect(await door.current.choose("a", OFF)).toMatchObject({ kind: "failed" });
  });
  expect(loadDrawingOutbox()).toEqual([]);
});

test("a choice that waits takes the place of the one before, and those of other runs stay", async () => {
  const fetchFn = answers(
    new Error("offline"),
    new Error("offline"),
    new Error("offline"),
  );
  const { result: door } = await renderHook(() =>
    useDrawingsOf(URL, account(), doors, options(fetchFn)),
  );

  await act(async () => {
    await door.current.choose("a", ON);
    await door.current.choose("b", ON);
    await door.current.choose("a", OFF);
  });
  expect(loadDrawingOutbox()).toEqual([
    { owner: OWNER, key: "b", ...ON },
    { owner: OWNER, key: "a", ...OFF },
  ]);
});

test("a session that ended leaves what waits for the account's next sign-in", async () => {
  const sessionEnded = jest.fn();
  const fetchFn = answers(new Error("offline"), {
    status: 401,
    body: apiError("not_signed_in"),
  });
  const { result: door } = await renderHook(() =>
    useDrawingsOf(URL, account({ sessionEnded }), doors, options(fetchFn)),
  );

  await act(async () => {
    await door.current.choose("a", ON);
  });
  await act(async () => {
    expect(await door.current.choose("a", OFF)).toMatchObject({ kind: "failed" });
  });
  expect(sessionEnded).toHaveBeenCalledWith(signedIn.token);
  expect(loadDrawingOutbox()).toEqual([{ owner: OWNER, key: "a", ...ON }]);
});
