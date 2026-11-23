import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiError } from "../account/testing";
import { SLEEP_CHOICE_FILE } from "../health/sleepChoice";
import { fakeSleepReader, SignedIn } from "../health/sleepEnd.testing";
import { sleepPostsOn } from "../health/sleepModules";
import type { SleepSample } from "../health/sleepNight";
import { lastNightOf, type SleepReader } from "../health/sleepSamples";
import { AddToFeed } from "./AddToFeed";
import { SLEEP_POST_PAGE_TEST_ID } from "./SleepPostPage";

// «Sleep» in the Feed's «+» (TASK-467 part E, TASK-481): the entry opens
// last night in the same sheet, under the sheet's title, and «Publish»
// closes it and has the Feed read again. Behind `sleepPostsOn` and a reader
// the phone does not have until part C: off, the sheet is the one of before.

jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => true),
}));
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../settings/useSport", () => ({ useSport: () => "run" }));

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
const API = "http://api";
const MIN = 60_000;
const DETAIL = "Last night's sleep score, from Apple Health";

/** The morning the sheet opens, on the phone's clock: the sheet reads the
 * time itself, so the clock of the test is held here. */
const NOW = new Date(2026, 8, 21, 9).getTime();
/** Asleep at 23:00 the evening before, for 7 h 30 min: no stages told. */
const FROM = new Date(2026, 8, 20, 23).getTime();
const SAMPLES: SleepSample[] = [
  { fromMs: FROM, toMs: FROM + 450 * MIN, stage: "asleep" },
];
const NIGHT = lastNightOf(SAMPLES, NOW);
let clock: jest.SpyInstance;

function reader(): SleepReader {
  return fakeSleepReader({ samples: jest.fn(async () => SAMPLES) });
}

/** A fetch that keeps a night published; any other question is a 404. */
function api() {
  const sent: string[] = [];
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    sent.push(`${method} ${url.replace(API, "").replace(/\d{4}-\d{2}-\d{2}$/, "…")}`);
    if (method === "PUT") {
      return Response.json({
        ...NIGHT,
        id: "7c1e5b02-93fa-4d6c-8e17-0a4b6d2f9c35",
        visibility: "everyone",
        published_at: "2026-09-21T07:05:00Z",
      });
    }
    return Response.json(apiError("http_error"), { status: 404 });
  }) as jest.Mock & typeof fetch;
  return { fetchFn, sent };
}

async function show(phone: SleepReader | null, fetchFn?: typeof fetch) {
  const onSleepPost = jest.fn();
  await render(
    <SignedIn>
      <AddToFeed
        available
        onRecord={jest.fn()}
        reader={phone}
        onSleepPost={onSleepPost}
        fetchFn={fetchFn}
      />
    </SignedIn>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Add to Feed" }));
  return onSleepPost;
}

beforeEach(() => {
  files.clear();
  on.mockReturnValue(true);
  clock = jest.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(() => {
  clock.mockRestore();
});

test("off: the list is the one of before, without «Sleep»", async () => {
  on.mockReturnValue(false);
  await show(reader());
  expect(screen.getByText("Record now")).toBeTruthy();
  expect(screen.getByText("Photos only")).toBeTruthy();
  expect(screen.getByText("From a file")).toBeTruthy();
  expect(screen.queryByText("Sleep")).toBeNull();
  expect(screen.queryByText(DETAIL)).toBeNull();
  expect(screen.queryByTestId("feed-add-sleep")).toBeNull();
});

test("on, but a phone without a reader, as every build until part C: no «Sleep»", async () => {
  await show(null);
  expect(screen.getByText("From a file")).toBeTruthy();
  expect(screen.queryByTestId("feed-add-sleep")).toBeNull();
});

test("on: «Sleep» is the last of the list, with what it publishes", async () => {
  await show(reader());
  expect(screen.getByTestId("feed-add-sleep")).toBeTruthy();
  expect(screen.getByText("Sleep")).toBeTruthy();
  expect(screen.getByText(DETAIL)).toBeTruthy();
  const ids = screen
    .getAllByTestId(/^feed-add-(record|photos|file|sleep)$/)
    .map((row) => row.props.testID);
  expect(ids).toEqual([
    "feed-add-record",
    "feed-add-photos",
    "feed-add-file",
    "feed-add-sleep",
  ]);
});

test("«Sleep» opens last night in the sheet, under one title; «‹» goes back", async () => {
  files.set(`file:///documents/${SLEEP_CHOICE_FILE}`, '{"on":true}');
  const { fetchFn } = api();
  await show(reader(), fetchFn);
  await fireEvent.press(screen.getByTestId("feed-add-sleep"));
  await act(async () => {});
  expect(screen.getByTestId(SLEEP_POST_PAGE_TEST_ID)).toBeTruthy();
  // «Sleep» once, the sheet's: the page has no title of its own.
  expect(screen.getAllByRole("header", { name: "Sleep" })).toHaveLength(1);
  expect(screen.getByText("7 h 30 min")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
  expect(screen.queryByText("Photos only")).toBeNull();

  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.queryByTestId(SLEEP_POST_PAGE_TEST_ID)).toBeNull();
  expect(screen.getByRole("header", { name: "Add to Feed" })).toBeTruthy();
  expect(screen.getByText("Photos only")).toBeTruthy();
});

test("«Publish» closes the sheet and has the Feed read again", async () => {
  files.set(`file:///documents/${SLEEP_CHOICE_FILE}`, '{"on":true}');
  const { fetchFn, sent } = api();
  const onSleepPost = await show(reader(), fetchFn);
  await fireEvent.press(screen.getByTestId("feed-add-sleep"));
  await act(async () => {});
  expect(onSleepPost).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Publish" }));
  await act(async () => {});
  expect(sent).toEqual(["GET /me/sleep-posts/…", "PUT /me/sleep-posts/…"]);
  expect(onSleepPost).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByTestId(SLEEP_POST_PAGE_TEST_ID)).toBeNull());
  await waitFor(() => expect(screen.queryByText("Photos only")).toBeNull());
});
