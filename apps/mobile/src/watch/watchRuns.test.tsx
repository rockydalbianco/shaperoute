import { readFileSync } from "fs";
import path from "path";

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react-native";

import { useWatchRuns } from "./useWatchRuns";
import type { WatchFile, WatchFiles } from "./watchLink";
import type { WatchRun } from "./watchRun";
import { WatchRunCard } from "./WatchRunCard";
import {
  forgetWatchRun,
  pendingWatchRuns,
  receiveWatchFile,
  WATCH_RUNS_KEPT,
  type WatchRunDoors,
} from "./watchRuns";

// The workouts of the watch waiting on the phone (TASK-370 part B3c2): the
// notification, the card on top of «My activities», «Open» and «Discard».

const TRACKS = JSON.parse(
  readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "targets",
      "watch",
      "Core",
      "Fixtures",
      "tracks.json",
    ),
    "utf8",
  ),
) as { valid: { json: Record<string, unknown> }[] };

const ALONG = TRACKS.valid[0].json;
const FREE = TRACKS.valid[1].json;

/** Doors with a store in memory and files by url. */
function doors(files: Record<string, string> = {}) {
  let kept: unknown[] = [];
  let now = 1000;
  const removed: string[] = [];
  const told = jest.fn(() => Promise.resolve());
  const fake: WatchRunDoors = {
    store: {
      load: () => kept as never[],
      save: (list) => {
        kept = list;
        return true;
      },
    },
    read: (url) => files[url] ?? null,
    remove: (url) => {
      removed.push(url);
    },
    notify: told,
    now: () => (now += 1000),
  };
  return { fake, removed, told };
}

function file(id: string, url: string, type = "track"): WatchFile {
  return { id, url, metadata: { type, v: 1 } };
}

const done = () => ({ done: jest.fn() });

test("a workout of the watch is kept, told about, and its file let go of", async () => {
  const { fake, removed, told } = doors({ "file:///a": JSON.stringify(ALONG) });
  const files = done();
  expect(await receiveWatchFile(file("1", "file:///a"), files, fake)).toBe(true);
  expect(told).toHaveBeenCalledTimes(1);
  expect(removed).toEqual(["file:///a"]);
  expect(files.done).toHaveBeenCalledWith("1");
  const [run] = pendingWatchRuns(fake);
  expect(run.id).toBe("1");
  expect(run.track.route?.title).toBe("Star");
});

test("a file that is not a workout, or does not read, is only let go of", async () => {
  const { fake, told } = doors({ "file:///b": "{nope", "file:///c": "{}" });
  const files = done();
  expect(await receiveWatchFile(file("2", "file:///b"), files, fake)).toBe(false);
  expect(await receiveWatchFile(file("3", "file:///c"), files, fake)).toBe(false);
  expect(await receiveWatchFile(file("4", "file:///d", "photo"), files, fake)).toBe(
    false,
  );
  expect(told).not.toHaveBeenCalled();
  expect(files.done).toHaveBeenCalledTimes(3);
  expect(pendingWatchRuns(fake)).toEqual([]);
});

test("the newest first, and only the last ones wait", async () => {
  const urls = Object.fromEntries(
    Array.from({ length: WATCH_RUNS_KEPT + 2 }, (_, i) => [
      `file:///${i}`,
      JSON.stringify(FREE),
    ]),
  );
  const { fake } = doors(urls);
  for (let i = 0; i < WATCH_RUNS_KEPT + 2; i += 1) {
    await receiveWatchFile(file(String(i), `file:///${i}`), done(), fake);
  }
  const runs = pendingWatchRuns(fake);
  expect(runs).toHaveLength(WATCH_RUNS_KEPT);
  expect(runs[0].id).toBe(String(WATCH_RUNS_KEPT + 1));
  forgetWatchRun(runs[0].id, fake);
  expect(pendingWatchRuns(fake)).toHaveLength(WATCH_RUNS_KEPT - 1);
});

test("the card shows each workout, opens it to the end of a run, or discards it", async () => {
  const { fake } = doors({
    "file:///a": JSON.stringify(ALONG),
    "file:///f": JSON.stringify(FREE),
  });
  await receiveWatchFile(file("a", "file:///a"), done(), fake);
  await receiveWatchFile(file("f", "file:///f"), done(), fake);
  const opened: WatchRun[] = [];
  const listen = jest.fn<() => void, [(file: WatchFile) => void]>(() => () => {});
  const files: WatchFiles = { listen, done: jest.fn() };
  await renderHook(() =>
    useWatchRuns((run) => opened.push(run), { files, doors: fake }),
  );
  expect(listen).toHaveBeenCalledTimes(1);
  await render(<WatchRunCard doors={fake} />);
  expect(screen.getAllByText("From your Apple Watch")).toHaveLength(2);
  expect(screen.getByText(/^Star · /)).toBeTruthy();
  await fireEvent.press(screen.getAllByRole("button", { name: /^Open, Star/ })[0]);
  expect(opened).toHaveLength(1);
  expect(opened[0].kind).toBe("route");
  expect(screen.getAllByText("From your Apple Watch")).toHaveLength(1);
  await fireEvent.press(screen.getByRole("button", { name: /^Discard/ }));
  expect(opened).toHaveLength(1);
  expect(screen.queryByText("From your Apple Watch")).toBeNull();
});

test("a file heard while the app is open is kept and shown", async () => {
  const { fake, told } = doors({ "file:///n": JSON.stringify(FREE) });
  let hear: (file: WatchFile) => void = () => {};
  const files: WatchFiles = {
    listen: (onFile) => {
      hear = onFile;
      return () => {};
    },
    done: jest.fn(),
  };
  await renderHook(() => useWatchRuns(() => {}, { files, doors: fake }));
  await render(<WatchRunCard doors={fake} />);
  expect(screen.queryByText("From your Apple Watch")).toBeNull();
  await act(async () => hear(file("n", "file:///n")));
  expect(told).toHaveBeenCalledTimes(1);
  expect(screen.getByText("From your Apple Watch")).toBeTruthy();
});
