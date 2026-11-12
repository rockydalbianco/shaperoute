import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";

import { apiError } from "../account/testing";
import { SLEEP_CHOICE_FILE } from "../health/sleepChoice";
import { fakeSleepReader, SIGNED_IN, SignedIn } from "../health/sleepEnd.testing";
import { sleepPostsOn } from "../health/sleepModules";
import type { SleepSample } from "../health/sleepNight";
import { SLEEP_SHARE_FILE } from "../health/sleepProfile";
import { lastNightOf, type SleepReader } from "../health/sleepSamples";
import { OWN_SLEEP_TEST_ID, OwnSleep } from "./OwnSleep";

// The «Sleep» card of one's own profile (TASK-467 part B3). Behind
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
const ME = SIGNED_IN.user.public_id;
const MIN = 60_000;
const SHOW = "Show my sleep from Apple Health";
const CANNOT =
  "MuW can't read your sleep. Allow it in the Health app: your profile › Apps › MuW.";

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
const EARLIER = { ...NIGHT, night: "2026-09-19", score: 70 };

function reader(changes: Partial<SleepReader> = {}) {
  return fakeSleepReader({
    samples: jest.fn(async () => SAMPLES),
    ...changes,
  }) as SleepReader & { ask: jest.Mock; samples: jest.Mock };
}

type Answer = { status: number; body?: unknown } | Error;

/** A fetch that answers by what is asked ("GET /users/…/sleep"); anything
 * not told is a 404. `sent()` is what was asked, in order. */
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

const READ = `GET /users/${ME}/sleep`;
const PUT = `PUT /me/sleep/${NIGHT.night}`;
const STOP = "DELETE /me/sleep/shared";

function allowed() {
  files.set(`file:///documents/${SLEEP_CHOICE_FILE}`, '{"on":true}');
}

function confirmed() {
  files.set(`file:///documents/${SLEEP_SHARE_FILE}`, '{"confirmed":true}');
}

async function show(phone: SleepReader | null, fetchFn: typeof fetch) {
  await render(
    <SignedIn>
      <OwnSleep reader={phone} nowMs={NOW} fetchFn={fetchFn} apiKey={null} />
    </SignedIn>,
  );
  await act(async () => {});
}

async function tap(name: string) {
  await fireEvent.press(screen.getByRole("button", { name }));
  await act(async () => {});
}

let alert: jest.SpyInstance;

beforeEach(() => {
  files.clear();
  on.mockReturnValue(true);
  alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => {
  alert.mockRestore();
});

/** The buttons of the question on the screen. */
function asked(): AlertButton[] {
  return (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
}

test("while the sleep is off: nothing shown, nothing read, nothing asked", async () => {
  on.mockReturnValue(false);
  allowed();
  const phone = reader();
  const { fetchFn } = api({ [READ]: { status: 200, body: NIGHT } });
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

test("before the yes: the button and what MuW does, nothing read or sent", async () => {
  const phone = reader();
  const { fetchFn } = api();
  await show(phone, fetchFn);
  expect(screen.getByTestId(OWN_SLEEP_TEST_ID)).toBeTruthy();
  expect(screen.getByRole("button", { name: SHOW })).toBeTruthy();
  expect(
    screen.getByText("MuW works out a sleep score from your Apple Health sleep data."),
  ).toBeTruthy();
  expect(screen.queryByText("Sleep score")).toBeNull();
  expect(phone.ask).not.toHaveBeenCalled();
  expect(phone.samples).not.toHaveBeenCalled();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("the tap is the yes: the phone asks, the yes is kept, last night shows", async () => {
  const phone = reader();
  const { fetchFn, sent } = api();
  await show(phone, fetchFn);
  await tap(SHOW);
  expect(phone.ask).toHaveBeenCalledTimes(1);
  expect(files.get(`file:///documents/${SLEEP_CHOICE_FILE}`)).toBe('{"on":true}');
  expect(screen.getByRole("header", { name: "Sleep score" })).toBeTruthy();
  expect(screen.getByText(`${NIGHT.score} · Excellent`)).toBeTruthy();
  expect(screen.getByText("7 h 30 min")).toBeTruthy();
  expect(
    screen.getByText(
      "Worked out by MuW from Apple Health data. It can differ from the score in the Health app.",
    ),
  ).toBeTruthy();
  // Not shared until «Share»: only which night the profile shows is asked.
  expect(screen.getByText("Only you see this")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Share" })).toBeTruthy();
  expect(sent()).toEqual([READ]);
  // No hour of going to bed or of waking.
  expect(screen.queryByText(/\d{1,2}:\d{2}/)).toBeNull();
});

test("a phone that cannot read says so, and the yes is not kept", async () => {
  const phone = reader({
    ask: jest.fn(async () => {
      throw new Error("denied");
    }),
  });
  const { fetchFn } = api();
  await show(phone, fetchFn);
  await tap(SHOW);
  expect(screen.getByText(CANNOT)).toBeTruthy();
  expect(files.has(`file:///documents/${SLEEP_CHOICE_FILE}`)).toBe(false);
  // The way to try again stays.
  expect(screen.getByRole("button", { name: SHOW })).toBeTruthy();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("with the yes kept the profile opens on last night, without asking again", async () => {
  allowed();
  const phone = reader();
  const { fetchFn } = api();
  await show(phone, fetchFn);
  expect(phone.ask).not.toHaveBeenCalled();
  expect(screen.getByText(`${NIGHT.score} · Excellent`)).toBeTruthy();
  expect(screen.queryByRole("button", { name: SHOW })).toBeNull();
});

test("no night since the evening: it says so, with nothing to share", async () => {
  allowed();
  const { fetchFn } = api();
  await show(reader({ samples: jest.fn(async () => []) }), fetchFn);
  expect(screen.getByText("No sleep data for last night in Apple Health.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
});

test("a reading that fails later says MuW cannot read the sleep", async () => {
  allowed();
  const failing = reader({
    samples: jest.fn(async () => {
      throw new Error("locked");
    }),
  });
  await show(failing, api().fetchFn);
  expect(screen.getByText(CANNOT)).toBeTruthy();
});

test("the first «Share» asks, in the words approved, and sends nothing before the yes", async () => {
  allowed();
  const { fetchFn, sent } = api({
    [PUT]: { status: 200, body: { ...NIGHT, shared: true } },
  });
  await show(reader(), fetchFn);
  await tap("Share");
  expect(alert).toHaveBeenCalledTimes(1);
  expect(alert.mock.calls[0][0]).toBe("Share your sleep?");
  expect(alert.mock.calls[0][1]).toBe(
    "Your score, hours slept and sleep stages show on your profile, to everyone who can see it.",
  );
  expect(asked().map((button) => button.text)).toEqual(["Cancel", "Share"]);
  expect(sent()).toEqual([READ]);
  // «Cancel» has nothing to do: still not shared, and asked again next time.
  expect(asked()[0].onPress).toBeUndefined();
  expect(files.has(`file:///documents/${SLEEP_SHARE_FILE}`)).toBe(false);
});

test("the yes shares the night: only its figures go, and the card says where it shows", async () => {
  allowed();
  const { fetchFn, calls, sent } = api({
    [PUT]: { status: 200, body: { ...NIGHT, shared: true } },
  });
  await show(reader(), fetchFn);
  await tap("Share");
  await act(async () => {
    asked()[1].onPress?.();
  });
  expect(sent()).toEqual([READ, PUT]);
  expect(calls[1].body).toEqual({
    score: NIGHT.score,
    asleep_min: NIGHT.asleep_min,
    awake_min: NIGHT.awake_min,
    shared: true,
  });
  expect(screen.getByText("On your profile")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Stop sharing" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
  expect(screen.queryByText("Only you see this")).toBeNull();
  // Asked once on this phone.
  expect(files.get(`file:///documents/${SLEEP_SHARE_FILE}`)).toBe('{"confirmed":true}');
});

test("after the first time «Share» shares at once", async () => {
  allowed();
  confirmed();
  const { fetchFn, sent } = api({
    [PUT]: { status: 200, body: { ...NIGHT, shared: true } },
  });
  await show(reader(), fetchFn);
  await tap("Share");
  expect(alert).not.toHaveBeenCalled();
  expect(sent()).toEqual([READ, PUT]);
  expect(screen.getByText("On your profile")).toBeTruthy();
});

test("a night already on the profile opens as shared, and «Stop sharing» takes it off", async () => {
  allowed();
  const { fetchFn, sent } = api({
    [READ]: { status: 200, body: NIGHT },
    [STOP]: { status: 204 },
  });
  await show(reader(), fetchFn);
  expect(screen.getByText("On your profile")).toBeTruthy();
  await tap("Stop sharing");
  expect(alert).not.toHaveBeenCalled();
  expect(sent()).toEqual([READ, STOP]);
  expect(screen.getByText("Only you see this")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Share" })).toBeTruthy();
});

test("an earlier night still on the profile is said with its day, under today's", async () => {
  allowed();
  confirmed();
  const { fetchFn, sent } = api({
    [READ]: { status: 200, body: EARLIER },
    [STOP]: { status: 204 },
    [PUT]: { status: 200, body: { ...NIGHT, shared: true } },
  });
  await show(reader(), fetchFn);
  // Today's night is not what the others see: it can be shared.
  expect(screen.getByText("Only you see this")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Share" })).toBeTruthy();
  expect(screen.getByText("On your profile · 19 Sep")).toBeTruthy();
  await tap("Stop sharing");
  expect(sent()).toEqual([READ, STOP]);
  expect(screen.queryByText(/On your profile/)).toBeNull();
  // Shared, today's takes the place.
  await tap("Share");
  expect(screen.getByText("On your profile")).toBeTruthy();
  expect(screen.queryByTestId("own-sleep-earlier")).toBeNull();
});

test("without a night today an earlier one can still be taken off the profile", async () => {
  allowed();
  const { fetchFn, sent } = api({
    [READ]: { status: 200, body: EARLIER },
    [STOP]: { status: 204 },
  });
  await show(reader({ samples: jest.fn(async () => []) }), fetchFn);
  expect(screen.getByText("No sleep data for last night in Apple Health.")).toBeTruthy();
  expect(screen.getByText("On your profile · 19 Sep")).toBeTruthy();
  await tap("Stop sharing");
  expect(sent()).toEqual([READ, STOP]);
  expect(screen.queryByText(/On your profile/)).toBeNull();
});

test("a share the API cannot take is said, and the night stays the owner's", async () => {
  allowed();
  confirmed();
  const { fetchFn } = api({ [PUT]: new Error("offline") });
  await show(reader(), fetchFn);
  await tap("Share");
  expect(screen.getByText("Only you see this")).toBeTruthy();
  expect(screen.queryByText("On your profile")).toBeNull();
  // What went wrong, under the card.
  expect(screen.getByTestId(OWN_SLEEP_TEST_ID)).toHaveTextContent(/reach|connection/i);
});
