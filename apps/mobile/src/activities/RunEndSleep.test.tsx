import type { SleepSummary } from "@shaperoute/shared-types";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { keepSleepOn } from "../health/sleepChoice";
import type { SleepSample } from "../health/sleepNight";
import type { SleepReader } from "../health/sleepSamples";
import {
  ActivitiesContext,
  type ActivitiesDoor,
  useActivitiesDoor,
} from "./activitiesDoor";
import { RunEnd } from "./RunEnd";

// «Sleep last night» at the end of an activity (TASK-467 part B2): in
// sight over «Save», on until turned off, and told to the door only when
// the post will show it. In every build until part C the phone has no
// reader of the sleep: nothing shows and nothing is told.

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
jest.mock("../settings/useSport", () => ({ useSport: () => "run" }));
// The night the fake reader's samples make: the example of the contract.
jest.mock("../health/sleepSamples", () => ({
  ...jest.requireActual("../health/sleepSamples"),
  readLastNight: jest.fn(async (reader: SleepReader) =>
    (await reader.available()) ? mockNight : null,
  ),
}));

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const mockNight: SleepSummary = summary;
const LINE = "82 · Very good · 7 h 32 min";
const NOTE = "Shown in this post. Turn it off to keep it to yourself.";

function reader(changes: Partial<SleepReader> = {}): SleepReader {
  return {
    store: "apple",
    available: async () => true,
    ask: jest.fn(async () => {}),
    samples: jest.fn(async (): Promise<SleepSample[]> => []),
    ...changes,
  };
}

async function shown(
  toSleep: jest.Mock,
  props: Partial<Parameters<typeof RunEnd>[0]> = {},
) {
  function WithDoor() {
    const nothing = useActivitiesDoor();
    const door: ActivitiesDoor = { ...nothing, signedIn: true, owner: 7, toSleep };
    return (
      <ActivitiesContext.Provider value={door}>
        <RunEnd onSave={() => true} onDiscard={jest.fn()} health={null} {...props} />
      </ActivitiesContext.Provider>
    );
  }
  await render(<WithDoor />);
  await act(async () => {});
}

const save = () =>
  fireEvent.press(screen.getByRole("button", { name: "Save to My activities" }));
const everyone = () => fireEvent.press(screen.getByRole("radio", { name: "Everyone" }));

beforeEach(() => files.clear());

test("this build has no reader: nothing shows, nothing is told", async () => {
  keepSleepOn();
  const toSleep = jest.fn();
  await shown(toSleep);
  await everyone();
  expect(screen.queryByTestId("sleep-run-end")).toBeNull();
  expect(screen.queryByText("Sleep last night")).toBeNull();
  await save();
  expect(toSleep).toHaveBeenCalledTimes(1);
  expect(toSleep).toHaveBeenCalledWith(null);
});

test("with a post others see, the night is in sight over «Save», on", async () => {
  keepSleepOn();
  const toSleep = jest.fn();
  await shown(toSleep, { sleep: reader() });
  // «Only me»: nobody would see it, so it is not offered.
  expect(screen.queryByTestId("sleep-run-end")).toBeNull();
  await everyone();
  expect(
    screen.getByRole("switch", { name: "Sleep last night", checked: true }),
  ).toBeTruthy();
  expect(screen.getByText(LINE)).toBeTruthy();
  expect(screen.getByText(NOTE)).toBeTruthy();
  await save();
  expect(toSleep).toHaveBeenCalledWith({ ...summary, shown: true });
});

test("turned off, the night stays on the phone", async () => {
  keepSleepOn();
  const toSleep = jest.fn();
  await shown(toSleep, { sleep: reader() });
  await everyone();
  await fireEvent.press(screen.getByRole("switch", { name: "Sleep last night" }));
  expect(
    screen.getByRole("switch", { name: "Sleep last night", checked: false }),
  ).toBeTruthy();
  // Off, the line that says it is shown is gone.
  expect(screen.queryByText(NOTE)).toBeNull();
  await save();
  expect(toSleep).toHaveBeenCalledWith(null);
});

test("a post only its owner sees carries no night", async () => {
  keepSleepOn();
  const toSleep = jest.fn();
  await shown(toSleep, { sleep: reader() });
  await save();
  expect(toSleep).toHaveBeenCalledWith(null);
  // Chosen and taken back: none either.
  toSleep.mockClear();
  await everyone();
  await fireEvent.press(screen.getByRole("radio", { name: "Only me" }));
  expect(screen.queryByTestId("sleep-run-end")).toBeNull();
  await save();
  expect(toSleep).toHaveBeenCalledWith(null);
});

test("without the user's yes to reading the sleep, nothing is read", async () => {
  const sleep = reader();
  const available = jest.spyOn(sleep, "available");
  const toSleep = jest.fn();
  await shown(toSleep, { sleep });
  await everyone();
  expect(available).not.toHaveBeenCalled();
  expect(sleep.ask).not.toHaveBeenCalled();
  expect(screen.queryByTestId("sleep-run-end")).toBeNull();
  await save();
  expect(toSleep).toHaveBeenCalledWith(null);
});

test("no night last night: no switch, and the end of the run never asks", async () => {
  keepSleepOn();
  const sleep = reader({ available: async () => false });
  const toSleep = jest.fn();
  await shown(toSleep, { sleep });
  await everyone();
  expect(screen.queryByTestId("sleep-run-end")).toBeNull();
  // The permission is asked on the profile's card, never here.
  expect(sleep.ask).not.toHaveBeenCalled();
  await save();
  expect(toSleep).toHaveBeenCalledWith(null);
});

test("an activity from a file is an old one: no night", async () => {
  keepSleepOn();
  const toSleep = jest.fn();
  await shown(toSleep, { sleep: reader(), imported: { sport: null } });
  expect(screen.queryByTestId("sleep-run-end")).toBeNull();
  await save();
  expect(toSleep).toHaveBeenCalledWith(null);
});
