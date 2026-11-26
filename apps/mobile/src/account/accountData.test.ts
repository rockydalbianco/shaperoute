import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { appBody, loadBody, saveBody, subscribeBody } from "../body/bodyProfile";
import { appHeart, saveHeart } from "../body/heartZones";
import { loadRecent, saveRecent } from "../search/recentSearches";
import { currentOwner, ownerFile, setCurrentOwner } from "./currentOwner";
import { forgetPhoneDataOf } from "./phoneOwners";
import { answers, type MemorySecureStore } from "./testing";
import { useAccount } from "./useAccount";

// The body, the heart and the recent searches belong to each account
// (TASK-507 part D, the user's choice «Di ogni account»): hidden with
// nobody signed in, back when the account signs in again; the recent
// searches and towns deleted as the account goes out.

jest.mock("expo-secure-store", () =>
  jest.requireActual<typeof import("./testing")>("./testing").memorySecureStore(),
);

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
const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
const YEAR = 2026;
const MINE = { sex: "female", weightKg: 58, heightCm: 166, birthYear: 1990 } as const;
const THEIRS = { sex: "male", weightKg: 84, heightCm: 181, birthYear: 1979 } as const;
const doc = (name: string) => `file:///documents/${name}`;

beforeEach(() => {
  files.clear();
  store.kept.clear();
  setCurrentOwner(null);
});

test("each account has its own body, and nobody's shows with nobody signed in", () => {
  setCurrentOwner(1);
  saveBody(MINE, YEAR);
  expect(files.has(doc("body.1.json"))).toBe(true);
  setCurrentOwner(2);
  expect(appBody().weightKg).toBeNull();
  saveBody(THEIRS, YEAR);
  setCurrentOwner(null);
  expect(appBody().weightKg).toBeNull();
  setCurrentOwner(1);
  expect(appBody()).toMatchObject({ weightKg: 58, heightCm: 166 });
  setCurrentOwner(2);
  expect(appBody()).toMatchObject({ weightKg: 84, heightCm: 181 });
});

test("the screens are told of the body of the account that signs in", () => {
  setCurrentOwner(1);
  saveBody(MINE, YEAR);
  const told = jest.fn();
  const stop = subscribeBody(told);
  setCurrentOwner(null);
  expect(told).toHaveBeenLastCalledWith(expect.objectContaining({ weightKg: null }));
  setCurrentOwner(1);
  expect(told).toHaveBeenLastCalledWith(expect.objectContaining({ weightKg: 58 }));
  stop();
});

test("a body kept before TASK-507 goes to the first account that signs in", () => {
  files.set(doc("body.json"), JSON.stringify(MINE));
  setCurrentOwner(7);
  expect(loadBody(YEAR)).toMatchObject({ weightKg: 58 });
  expect(files.has(doc("body.json"))).toBe(false);
  expect(files.has(doc("body.7.json"))).toBe(true);
  setCurrentOwner(8);
  expect(loadBody(YEAR).weightKg).toBeNull();
});

test("the heart too, account by account", () => {
  setCurrentOwner(1);
  saveHeart({ maxBpm: 190, restBpm: 52 } as Parameters<typeof saveHeart>[0]);
  setCurrentOwner(2);
  expect(appHeart().maxBpm).toBeNull();
  setCurrentOwner(1);
  expect(appHeart().maxBpm).toBe(190);
});

test("an account deleted, or its number now somebody else's, takes its body and heart", () => {
  setCurrentOwner(1);
  saveBody(MINE, YEAR);
  saveHeart({ maxBpm: 190, restBpm: 52 } as Parameters<typeof saveHeart>[0]);
  setCurrentOwner(2);
  saveBody(THEIRS, YEAR);
  forgetPhoneDataOf(1);
  expect(files.has(doc(ownerFile("body.json", 1)))).toBe(false);
  expect(files.has(doc(ownerFile("heart.json", 1)))).toBe(false);
  expect(files.has(doc(ownerFile("body.json", 2)))).toBe(true);
});

test("logging out hides the body and deletes the recent searches and towns", async () => {
  store.kept.set("shaperoute.session", JSON.stringify(session));
  const fetchFn: jest.Mock = answers(
    { status: 200, body: session.user },
    { status: 204 },
  );
  const { result } = await renderHook(() =>
    useAccount("http://api", { fetchFn, key: null }),
  );
  expect(currentOwner()).toBe(session.user.id);
  saveBody(MINE, YEAR);
  saveRecent(["heart", "cat"]);
  files.set(doc("recent-cities.json"), JSON.stringify([{ label: "Trento" }]));
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));

  await act(async () => result.current.signOut());
  expect(currentOwner()).toBeNull();
  expect(appBody().weightKg).toBeNull();
  expect(loadRecent()).toEqual([]);
  expect(files.get(doc("recent-cities.json"))).toBe("[]");
  // The body waits for the account.
  expect(files.has(doc(ownerFile("body.json", session.user.id)))).toBe(true);
});
