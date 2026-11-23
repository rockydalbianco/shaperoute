import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import gymRequest from "@shaperoute/shared-types/fixtures/gym-session.json";
import poolRequest from "@shaperoute/shared-types/fixtures/pool-swim.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import stretchRequest from "@shaperoute/shared-types/fixtures/stretch-session.json";
import type {
  GymSessionRequest,
  PoolSwimRequest,
  StretchSessionRequest,
} from "@shaperoute/shared-types";
import { renderHook, waitFor } from "@testing-library/react-native";

import { keepWaiting, loadOutbox } from "../activities/outbox";
import type { ActivityRequest } from "../api/activities";
import { keepGymWaiting, loadGymOutbox } from "../gym/gymOutbox";
import { keepPoolWaiting, loadPoolOutbox } from "../pool/poolOutbox";
import { keepStretchWaiting, loadStretchOutbox } from "../stretchSport/stretchOutbox";
import {
  claimPhoneData,
  forgetPhoneDataOf,
  PHONE_OWNERS_FILE,
  serverOf,
} from "./phoneOwners";
import { answers, type MemorySecureStore } from "./testing";
import { useAccount } from "./useAccount";

// Whose the data waiting on the phone is (TASK-507, ADR-0406): the account's
// number says it only on one server and one database. The try-out of
// 2026-11-23 sent three stretching sessions of an account of 2026-11-21 as
// those of a new account with the same number, from a database started again.

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
const URL = "http://api";
const ME = session.user;
const OTHER = ME.id + 1;
const SOMEBODY_ELSE = "5d0b9e1a-7c2f-4e3d-8a6b-1f9c3e7d2a40";

function fill(owner: number): void {
  keepWaiting({ id: "run", owner, request: request as ActivityRequest });
  keepGymWaiting({ owner, key: "gym", request: gymRequest as GymSessionRequest });
  keepPoolWaiting({ owner, key: "pool", request: poolRequest as PoolSwimRequest });
  keepStretchWaiting({
    owner,
    key: "stretch",
    request: stretchRequest as StretchSessionRequest,
  });
}

function owners(): number[][] {
  return [loadOutbox(), loadGymOutbox(), loadPoolOutbox(), loadStretchOutbox()].map(
    (list) => list.map((item) => item.owner),
  );
}

function known(id: number, publicId: string, server: string): void {
  files.set(
    `file:///documents/${PHONE_OWNERS_FILE}`,
    JSON.stringify([{ id, publicId, server }]),
  );
}

beforeEach(() => {
  files.clear();
  store.kept.clear();
});

test("the same number as somebody else: what waited under it is let go, the others' stays", () => {
  fill(ME.id);
  fill(OTHER);
  known(ME.id, SOMEBODY_ELSE, serverOf(URL));
  expect(claimPhoneData(ME, URL)).toBe(true);
  expect(owners()).toEqual([[OTHER], [OTHER], [OTHER], [OTHER]]);
  // Now the phone knows the number as this account: nothing more goes.
  fill(ME.id);
  expect(claimPhoneData(ME, URL)).toBe(false);
  expect(owners()).toEqual([
    [OTHER, ME.id],
    [OTHER, ME.id],
    [OTHER, ME.id],
    [OTHER, ME.id],
  ]);
});

test("the same account on another server is not the same account", () => {
  fill(ME.id);
  known(ME.id, ME.public_id, "http://127.0.0.1:8051");
  expect(claimPhoneData(ME, URL)).toBe(true);
  expect(owners()).toEqual([[], [], [], []]);
});

test("the same account again keeps everything, the address written another way too", () => {
  fill(ME.id);
  known(ME.id, ME.public_id, serverOf(URL));
  expect(claimPhoneData(ME, "HTTP://API/")).toBe(false);
  expect(owners()).toEqual([[ME.id], [ME.id], [ME.id], [ME.id]]);
});

test("an account seen for the first time takes what waits under its number", () => {
  fill(ME.id);
  const forget = jest.fn();
  expect(claimPhoneData(ME, URL, forget)).toBe(false);
  expect(forget).not.toHaveBeenCalled();
  expect(owners()).toEqual([[ME.id], [ME.id], [ME.id], [ME.id]]);
});

test("without a public_id or a server nothing can be told apart, and nothing changes", () => {
  fill(ME.id);
  known(ME.id, SOMEBODY_ELSE, serverOf(URL));
  const forget = jest.fn();
  expect(claimPhoneData({ id: ME.id }, URL, forget)).toBe(false);
  expect(claimPhoneData(ME, null, forget)).toBe(false);
  expect(forget).not.toHaveBeenCalled();
});

test("everything of one account goes, nothing of another", () => {
  fill(ME.id);
  fill(OTHER);
  forgetPhoneDataOf(ME.id);
  expect(owners()).toEqual([[OTHER], [OTHER], [OTHER], [OTHER]]);
});

test("the try-out: an app opening on a number now of somebody else sends nothing of the old one", async () => {
  fill(ME.id);
  known(ME.id, SOMEBODY_ELSE, serverOf(URL));
  store.kept.set("shaperoute.session", JSON.stringify(session));
  const fetchFn: jest.Mock = answers({ status: 200, body: ME });
  const { result } = await renderHook(() => useAccount(URL, { fetchFn, key: null }));
  // Let go as the account opened, before any outbox could send.
  expect(owners()).toEqual([[], [], [], []]);
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
  expect(result.current.state.status).toBe("signedIn");
});
