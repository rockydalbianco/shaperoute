import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { apiError } from "../account/testing";
import { SLEEP_CHOICE_FILE } from "../health/sleepChoice";
import { fakeSleepReader, SignedIn } from "../health/sleepEnd.testing";
import { sleepPostsOn } from "../health/sleepModules";
import type { SleepSample } from "../health/sleepNight";
import { lastNightOf, type SleepReader } from "../health/sleepSamples";
import { SLEEP_POST_PAGE_TEST_ID, SleepPostPage } from "./SleepPostPage";

// «Sleep», opened from the Feed's «+» (TASK-467 part E). Behind
// `sleepPostsOn` and a reader the phone does not have until part C: both
// given here to test what they hide. Every time is on the phone's clock.

jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => true),
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
const API = "http://api";
const MIN = 60_000;
const SHOW = "Show my sleep from Apple Health";
const GOES = "Your score, hours slept and sleep stages go in the Feed.";

/** A moment of 21 September 2026, `days` days on, on the phone's clock. */
function at(days: number, hour: number): number {
  return new Date(2026, 8, 21 + days, hour).getTime();
}

const NOW = at(0, 9);
/** Asleep at 23:00 the evening before, for 7 h 30 min: no stages told. */
const SAMPLES: SleepSample[] = [
  { fromMs: at(-1, 23), toMs: at(-1, 23) + 450 * MIN, stage: "asleep" },
];
const found = lastNightOf(SAMPLES, NOW);
if (found === null) {
  throw new Error("The samples of the test are a night");
}
const NIGHT = found;
const POST = {
  ...NIGHT,
  id: "7c1e5b02-93fa-4d6c-8e17-0a4b6d2f9c35",
  visibility: "everyone",
  published_at: "2026-09-21T07:05:00Z",
};

function reader(changes: Partial<SleepReader> = {}) {
  return fakeSleepReader({
    samples: jest.fn(async () => SAMPLES),
    ...changes,
  }) as SleepReader & { ask: jest.Mock; samples: jest.Mock };
}

type Answer = { status: number; body?: unknown } | Error;

/** A fetch that answers by what is asked ("GET /me/sleep-posts/…");
 * anything not told is a 404. `sent()` is what was asked, in order. */
function api(told: Record<string, Answer> = {}) {
  const calls: { asked: string; body: unknown }[] = [];
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    const asked = `${init?.method ?? "GET"} ${url.replace(API, "")}`;
    calls.push({ asked, body: init?.body ? JSON.parse(String(init.body)) : null });
    const answer = told[asked] ?? { status: 404, body: apiError("http_error") };
    if (answer instanceof Error) {
      throw answer;
    }
    return answer.body === undefined
      ? new Response(null, { status: answer.status })
      : Response.json(answer.body, { status: answer.status });
  }) as jest.Mock & typeof fetch;
  return { fetchFn, calls, sent: () => calls.map((call) => call.asked) };
}

const READ = `GET /me/sleep-posts/${NIGHT.night}`;
const PUT = `PUT /me/sleep-posts/${NIGHT.night}`;
const REMOVE = `DELETE /me/sleep-posts/${NIGHT.night}`;

function allowed() {
  files.set(`file:///documents/${SLEEP_CHOICE_FILE}`, '{"on":true}');
}

/** The Feed told to read again. */
const onChanged = jest.fn();

async function show(phone: SleepReader | null, fetchFn: typeof fetch) {
  const onDone = jest.fn();
  await render(
    <SignedIn>
      <SleepPostPage
        reader={phone}
        nowMs={NOW}
        fetchFn={fetchFn}
        apiKey={null}
        onDone={onDone}
        onChanged={onChanged}
      />
    </SignedIn>,
  );
  await act(async () => {});
  return onDone;
}

async function tap(role: "button" | "radio", name: string) {
  await fireEvent.press(screen.getByRole(role, { name }));
  await act(async () => {});
}

beforeEach(() => {
  onChanged.mockClear();
  files.clear();
  on.mockReturnValue(true);
});

test("while the sleep is off: nothing shown, nothing read, nothing asked", async () => {
  on.mockReturnValue(false);
  allowed();
  const phone = reader();
  const { fetchFn } = api({ [READ]: { status: 200, body: POST } });
  await show(phone, fetchFn);
  expect(screen.toJSON()).toBeNull();
  expect(phone.ask).not.toHaveBeenCalled();
  expect(phone.samples).not.toHaveBeenCalled();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("without a reader of the sleep, as every build until part C: nothing", async () => {
  allowed();
  const { fetchFn } = api();
  await show(null, fetchFn);
  expect(screen.toJSON()).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("without the yes to reading the sleep, the same button as on the profile", async () => {
  const phone = reader();
  const { fetchFn, sent } = api();
  await show(phone, fetchFn);
  // The title is the sheet's (AddToFeed.tsx): none here.
  expect(screen.queryByRole("header")).toBeNull();
  expect(screen.getByRole("button", { name: SHOW })).toBeTruthy();
  expect(phone.samples).not.toHaveBeenCalled();
  expect(fetchFn).not.toHaveBeenCalled();

  await tap("button", SHOW);
  expect(phone.ask).toHaveBeenCalledTimes(1);
  expect(files.get(`file:///documents/${SLEEP_CHOICE_FILE}`)).toBe('{"on":true}');
  expect(screen.getByText(`${NIGHT.score} · Excellent`)).toBeTruthy();
  // Only whether the night is a post already is asked: its day.
  expect(sent()).toEqual([READ]);
});

test("last night, who sees it starting on «Everyone», and «Publish»", async () => {
  allowed();
  const { fetchFn, sent } = api();
  await show(reader(), fetchFn);
  expect(screen.getByTestId(SLEEP_POST_PAGE_TEST_ID)).toBeTruthy();
  expect(screen.getByText(`${NIGHT.score} · Excellent`)).toBeTruthy();
  expect(screen.getByText("7 h 30 min")).toBeTruthy();
  expect(screen.getByRole("radio", { name: "Everyone" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Followers" })).not.toBeChecked();
  // Never «Only me»: only what is published reaches the server.
  expect(screen.queryByRole("radio", { name: "Only me" })).toBeNull();
  expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
  expect(screen.getByText(GOES)).toBeTruthy();
  // Nothing left the phone: only the question about this day.
  expect(sent()).toEqual([READ]);
  expect(screen.queryByText(/\d{1,2}:\d{2}/)).toBeNull();
});

test("«Publish» puts the night in the Feed with the choice made, and the sheet closes", async () => {
  allowed();
  const { fetchFn, calls, sent } = api({
    [PUT]: { status: 200, body: { ...POST, visibility: "followers" } },
  });
  const onDone = await show(reader(), fetchFn);
  await tap("radio", "Followers");
  expect(screen.getByRole("radio", { name: "Followers" })).toBeChecked();
  await tap("button", "Publish");
  expect(sent()).toEqual([READ, PUT]);
  expect(calls[1].body).toEqual({
    score: NIGHT.score,
    asleep_min: NIGHT.asleep_min,
    awake_min: NIGHT.awake_min,
    visibility: "followers",
  });
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(onChanged).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Already in the Feed")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
});

test("a night already in the Feed says so, and «Remove post» takes it off", async () => {
  allowed();
  const { fetchFn, sent } = api({
    [READ]: { status: 200, body: POST },
    [REMOVE]: { status: 204 },
  });
  const onDone = await show(reader(), fetchFn);
  expect(screen.getByText("Already in the Feed")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
  expect(screen.queryByRole("radiogroup")).toBeNull();
  expect(onChanged).not.toHaveBeenCalled();
  await tap("button", "Remove post");
  expect(sent()).toEqual([READ, REMOVE]);
  expect(onChanged).toHaveBeenCalledTimes(1);
  // Off the Feed, it can be published again; the sheet stays.
  expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
  expect(screen.queryByText("Already in the Feed")).toBeNull();
  expect(onDone).not.toHaveBeenCalled();
});

test("no night since the evening: it says so, with nothing to publish", async () => {
  allowed();
  const { fetchFn } = api();
  await show(reader({ samples: jest.fn(async () => []) }), fetchFn);
  expect(
    screen.getByText("No sleep data for last night in Apple Health."),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("a phone that cannot read says so", async () => {
  allowed();
  const failing = reader({
    samples: jest.fn(async () => {
      throw new Error("locked");
    }),
  });
  await show(failing, api().fetchFn);
  expect(
    screen.getByText(
      "MuW can't read your sleep. Allow it in the Health app: your profile › Apps › MuW.",
    ),
  ).toBeTruthy();
});

test("a post the API cannot take is said, and nothing is in the Feed", async () => {
  allowed();
  const { fetchFn } = api({ [PUT]: new Error("offline") });
  const onDone = await show(reader(), fetchFn);
  await tap("button", "Publish");
  expect(onDone).not.toHaveBeenCalled();
  expect(screen.queryByText("Already in the Feed")).toBeNull();
  expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
  expect(screen.getByTestId(SLEEP_POST_PAGE_TEST_ID)).toHaveTextContent(
    /reach|connection/i,
  );
});
