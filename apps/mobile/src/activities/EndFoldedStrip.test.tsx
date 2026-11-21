/**
 * The card at the end of an activity, folded (TASK-478 part b): how far and
 * how long, as the card says them, and «Save» beside them, with an
 * account; touched, the numbers open the card again.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { addFix, emptyTrack, type Track } from "../navigation/trackRecorder";
import { EndFoldedStrip } from "./EndFoldedStrip";

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

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;
const T0 = Date.UTC(2026, 10, 18, 7, 0, 0);

/** 3 km north in 18 minutes, a fix every 10 m. */
function run(): Track {
  let track = emptyTrack();
  for (let i = 0; i <= 300; i += 1) {
    track = addFix(track, {
      point: [START[0] + i * 10 * METRE, START[1]],
      timeMs: T0 + i * 3600,
      accuracyM: 5,
    });
  }
  return track;
}

test("the strip says how far and how long, and «Save» saves", async () => {
  const onSave = jest.fn();
  const onOpen = jest.fn();
  await render(<EndFoldedStrip track={run()} onOpen={onOpen} onSave={onSave} />);
  expect(screen.getByText(/3\.00/)).toBeOnTheScreen();
  expect(screen.getByText(/18:00/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText("Save to My activities"));
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onOpen).not.toHaveBeenCalled();
});

test("the numbers touched open the card", async () => {
  const onOpen = jest.fn();
  await render(<EndFoldedStrip track={run()} onOpen={onOpen} onSave={jest.fn()} />);
  await fireEvent.press(screen.getByLabelText("Show the numbers"));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("without an account, no «Save» in the strip", async () => {
  await render(<EndFoldedStrip track={run()} onOpen={jest.fn()} />);
  expect(screen.queryByLabelText("Save to My activities")).toBeNull();
  expect(screen.getByLabelText("Show the numbers")).toBeOnTheScreen();
});
