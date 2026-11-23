import { act, render } from "@testing-library/react-native";
import { File, Paths } from "expo-file-system";

import { DrawingsContext, useDrawingsDoor } from "../social/drawingsDoor";
import type { SavedRun } from "../navigation/trackStore";
import {
  loadPending,
  PENDING_MS,
  queueSkiDay,
  saveSnow,
  SKI_DAY_FILE,
} from "./skiDayStore";
import { RETRY_MS, useSkiDayOutbox } from "./useSkiDayOutbox";

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
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

// The days of skiing whose choices wait for the API (TASK-406 part D2).

const NOW = 1_793_610_000_000;

function runAt(ms: number): SavedRun {
  return {
    track: { fixes: [{ point: [46.38, 11.52], timeMs: ms }] },
  } as unknown as SavedRun;
}

function Outbox({ now }: { now: () => number }) {
  useSkiDayOutbox(now);
  return null;
}

function App({ keep, now = () => NOW }: { keep: jest.Mock; now?: () => number }) {
  const nothing = useDrawingsDoor();
  return (
    <DrawingsContext.Provider value={{ ...nothing, keepSkiDay: keep }}>
      <Outbox now={now} />
    </DrawingsContext.Provider>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  const file = new File(Paths.document, SKI_DAY_FILE);
  if (file.exists) {
    file.delete();
  }
});
afterEach(() => jest.useRealTimers());

test("a day queued is sent at once, and leaves the phone once sent", async () => {
  const keep = jest.fn(async (_key: string, _request: unknown) => "sent");
  await render(<App keep={keep} />);
  saveSnow("powder");
  await act(async () => {
    queueSkiDay(runAt(NOW - 1000), NOW);
  });
  expect(keep).toHaveBeenCalledTimes(1);
  expect(keep.mock.calls[0][1]).toEqual({
    resort_id: null,
    gear: null,
    snow: "powder",
  });
  expect(loadPending()).toEqual([]);
});

test("a day not on the API yet is tried again later, a refused one never", async () => {
  saveSnow("icy");
  queueSkiDay(runAt(NOW - 2000), NOW);
  saveSnow("heavy");
  queueSkiDay(runAt(NOW - 1000), NOW);
  const keep = jest
    .fn()
    .mockResolvedValueOnce("later")
    .mockResolvedValueOnce("refused")
    .mockResolvedValueOnce("sent");
  await render(<App keep={keep} />);
  await act(async () => {});
  expect(keep).toHaveBeenCalledTimes(2);
  expect(loadPending()).toHaveLength(1);
  // The gear written letter by letter is no reason to send again.
  await act(async () => {
    saveSnow("spring");
  });
  expect(keep).toHaveBeenCalledTimes(2);
  await act(async () => {
    jest.advanceTimersByTime(RETRY_MS);
  });
  expect(keep).toHaveBeenCalledTimes(3);
  expect(loadPending()).toEqual([]);
});

test("a day waiting too long is let go unsent", async () => {
  saveSnow("powder");
  queueSkiDay(runAt(NOW - 1000), NOW);
  const keep = jest.fn(async () => "later");
  await render(<App keep={keep} now={() => NOW + PENDING_MS + 1} />);
  await act(async () => {});
  expect(keep).not.toHaveBeenCalled();
  expect(loadPending()).toEqual([]);
});
