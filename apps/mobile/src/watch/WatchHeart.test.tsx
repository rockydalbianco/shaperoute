import { act, render, screen } from "@testing-library/react-native";

import { appHeart, saveHeart, zonesOf } from "../body/heartZones";
import { WatchHeart, zoneOf } from "./WatchHeart";

// The heart rate of the Apple Watch on the run's card (TASK-370 part A3).

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

const NO_ZONES = { ...appHeart(), maxBpm: null };

afterEach(async () => {
  await act(async () => saveHeart(NO_ZONES));
});

test("the zone of a heart rate: under the first none, over the max the last", () => {
  // 190 at the top: 95, 114, 133, 152, 171, 190.
  const zones = zonesOf(190, NO_ZONES);
  expect(zoneOf(94, zones)).toBeNull();
  expect(zoneOf(95, zones)?.number).toBe(1);
  expect(zoneOf(132, zones)?.number).toBe(2);
  expect(zoneOf(133, zones)?.number).toBe(3);
  expect(zoneOf(190, zones)?.number).toBe(5);
  expect(zoneOf(205, zones)?.number).toBe(5);
  expect(zoneOf(150, [])).toBeNull();
});

test("nothing without a watch", async () => {
  await render(<WatchHeart bpm={null} />);
  expect(screen.queryByTestId("watch-heart")).toBeNull();
});

test("the heart rate alone while there are no zones", async () => {
  await act(async () => saveHeart(NO_ZONES));
  await render(<WatchHeart bpm={142} />);
  expect(screen.getByTestId("watch-heart")).toHaveTextContent("♥ 142 bpm");
});

test("with a max heart rate, its zone by the name of «Heart rate zones»", async () => {
  await act(async () => saveHeart({ ...NO_ZONES, maxBpm: 190 }));
  await render(<WatchHeart bpm={142} />);
  expect(screen.getByTestId("watch-heart")).toHaveTextContent(
    "♥ 142 bpm · Zone 3 Tempo",
  );
});
