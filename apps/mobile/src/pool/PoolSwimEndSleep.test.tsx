import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";
import type { SleepSummary } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { loadSleepOutbox } from "../activities/sleepOut";
import { keepSleepOn } from "../health/sleepChoice";
import {
  fakeApi,
  fakeSleepReader,
  OWNER,
  SignedIn,
  without,
} from "../health/sleepEnd.testing";
import type { SleepReader } from "../health/sleepSamples";
import { loadPoolOutbox } from "./poolOutbox";
import { finishPoolSwim, newPoolSwim } from "./poolSwim";
import { PoolSwimEnd } from "./PoolSwimEnd";
import { usePoolOutbox } from "./usePoolOutbox";

// «Sleep last night» at the end of a swim in a pool (TASK-467 part B2b),
// as at the end of a run. In every build until part C the phone has no
// reader of the sleep: the end of a swim is drawn exactly as before, and
// its outbox asks nothing about a night.

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
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
// The night the fake reader's samples make: the example of the contract.
jest.mock("../health/sleepSamples", () => ({
  ...jest.requireActual("../health/sleepSamples"),
  readLastNight: jest.fn(async (reader: SleepReader) =>
    (await reader.available()) ? mockNight : null,
  ),
}));

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const mockNight: SleepSummary = summary;
const T0 = Date.UTC(2026, 8, 21, 17);
const MIN = 60_000;
const KEY = "poolkey12345";
const SESSIONS = /^\/me\/pool-swims\/[^/]+$/;
/** The swim as the API answers it once saved. */
const poolSwim = {
  id: "x",
  started_at: "2026-09-21T17:00:00Z",
  duration_s: 2400,
  distance_m: 1500,
  pool_length_m: 25,
  lengths: 60,
};

function ended() {
  return finishPoolSwim(newPoolSwim(KEY, 25, T0), T0 + 40 * MIN);
}

/** The end of the swim, saved through the real outbox on the fake API. */
function End({
  fetchFn,
  sleep,
}: {
  fetchFn: typeof fetch;
  sleep?: SleepReader | null;
}) {
  const { save } = usePoolOutbox(fetchFn);
  const more = sleep === undefined ? {} : { sleep };
  return (
    <PoolSwimEnd swim={ended()} onSave={save} health={null} heart={null} {...more} />
  );
}

async function shown(fetchFn: typeof fetch, sleep?: SleepReader | null) {
  await render(
    <SignedIn>
      <End fetchFn={fetchFn} sleep={sleep} />
    </SignedIn>,
  );
  await act(async () => {});
}

const everyone = () => fireEvent.press(screen.getByRole("radio", { name: "Everyone" }));
const save = async () => {
  await fireEvent.press(screen.getByTestId("pool-save"));
  await act(async () => {});
};

beforeEach(() => {
  files.clear();
});

test("in the builds of today the end of a swim is drawn exactly as before", async () => {
  keepSleepOn();
  const api = fakeApi(poolSwim, SESSIONS);
  await shown(api.fetchFn);
  await everyone();
  expect(screen.queryByTestId("sleep-run-end")).toBeNull();
  expect(screen.queryByText("Sleep last night")).toBeNull();
  const today = screen.toJSON();
  // With a reader the screen is the same, but for the block of the sleep.
  await screen.unmount();
  await shown(fakeApi(poolSwim, SESSIONS).fetchFn, fakeSleepReader());
  await everyone();
  expect(screen.getByTestId("sleep-run-end")).toBeTruthy();
  // Functions apart (JSON leaves them out): every node, style and word.
  const drawn = (tree: unknown, testID: string) =>
    JSON.stringify(without(tree, testID));
  expect(drawn(screen.toJSON(), "sleep-run-end")).toBe(drawn(today, "sleep-run-end"));
  // And without the block nothing was taken away from today's screen.
  expect(drawn(today, "sleep-run-end")).toBe(drawn(today, "none-such"));
  expect(drawn(screen.toJSON(), "none-such")).not.toBe(drawn(today, "none-such"));
});

test("in the builds of today «Save» keeps no night, and the outbox asks for none", async () => {
  keepSleepOn();
  const api = fakeApi(poolSwim, SESSIONS);
  await shown(api.fetchFn);
  await everyone();
  await save();
  await waitFor(() => expect(loadPoolOutbox()).toEqual([]));
  expect(api.sent()[0]).toBe(`PUT /me/pool-swims/${KEY}`);
  expect(api.calls.some((call) => /sleep/.test(call.path))).toBe(false);
  expect(loadSleepOutbox()).toEqual([]);
});

test("with a post others see, the night is over «Save», on, and goes after the swim", async () => {
  keepSleepOn();
  const api = fakeApi(poolSwim, SESSIONS);
  await shown(api.fetchFn, fakeSleepReader());
  // «Only me»: nobody would see it, so it is not offered.
  expect(screen.queryByTestId("sleep-run-end")).toBeNull();
  await everyone();
  expect(
    screen.getByRole("switch", { name: "Sleep last night", checked: true }),
  ).toBeTruthy();
  expect(screen.getByText("82 · Very good · 7 h 32 min")).toBeTruthy();
  await save();
  await waitFor(() => expect(api.sent()).toContain(`PUT /me/activities/${KEY}/sleep`));
  const sent = api.sent();
  expect(sent.indexOf(`PUT /me/pool-swims/${KEY}`)).toBeLessThan(
    sent.indexOf(`PUT /me/activities/${KEY}/sleep`),
  );
  expect(api.calls.find((call) => call.path.endsWith("/sleep"))?.body).toEqual({
    ...summary,
    shown: true,
  });
  await waitFor(() => expect(loadSleepOutbox()).toEqual([]));
});

test("turned off, or with a post only its owner sees, nothing of the night is kept", async () => {
  keepSleepOn();
  const api = fakeApi(poolSwim, SESSIONS);
  await shown(api.fetchFn, fakeSleepReader());
  await everyone();
  await fireEvent.press(screen.getByRole("switch", { name: "Sleep last night" }));
  await save();
  await waitFor(() => expect(loadPoolOutbox()).toEqual([]));
  expect(loadSleepOutbox()).toEqual([]);
  expect(api.calls.some((call) => /sleep/.test(call.path))).toBe(false);

  await screen.unmount();
  files.clear();
  keepSleepOn();
  const other = fakeApi(poolSwim, SESSIONS);
  await shown(other.fetchFn, fakeSleepReader());
  await save();
  await waitFor(() => expect(loadPoolOutbox()).toEqual([]));
  expect(loadSleepOutbox()).toEqual([]);
  expect(other.calls.some((call) => /sleep/.test(call.path))).toBe(false);
});

test("without the user's yes nothing is read, and the end never asks", async () => {
  const sleep = fakeSleepReader();
  const available = jest.spyOn(sleep, "available");
  await shown(fakeApi(poolSwim, SESSIONS).fetchFn, sleep);
  await everyone();
  expect(available).not.toHaveBeenCalled();
  expect(sleep.ask).not.toHaveBeenCalled();
  expect(screen.queryByTestId("sleep-run-end")).toBeNull();
});

test("while the swim waits for a network, its night waits with it", async () => {
  keepSleepOn();
  const api = fakeApi(poolSwim, SESSIONS, true);
  await shown(api.fetchFn, fakeSleepReader());
  await everyone();
  await save();
  expect(loadPoolOutbox().map((item) => item.key)).toEqual([KEY]);
  // Kept on the phone, and not asked of an API that does not have the
  // swim yet: a 404 would drop it.
  expect(loadSleepOutbox().map((item) => `${item.owner}:${item.key}`)).toEqual([
    `${OWNER}:${KEY}`,
  ]);
  expect(api.calls.some((call) => /sleep/.test(call.path))).toBe(false);
});
