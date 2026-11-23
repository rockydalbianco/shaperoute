import type { Gear, Session } from "@shaperoute/shared-types";
import list from "@shaperoute/shared-types/fixtures/gear-list.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { FollowsContext } from "../social/followsDoor";
import {
  ActivitiesContext,
  type ActivitiesDoor,
  useActivitiesDoor,
} from "./activitiesDoor";
import { RunEnd } from "./RunEnd";

// «Gear» at the end of an activity (TASK-486 part C, ADR-0393): the items
// in use, the sport's defaults chosen, told to the door at «Save».

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
jest.mock("../gear/gearOn", () => ({ GEAR_ON: true }));
jest.mock("../api/gear", () => ({
  ...jest.requireActual("../api/gear"),
  fetchMyGear: jest.fn(async () => ({ kind: "ok", value: mockMine })),
}));

const [SHOES, HELMET] = list.gear as Gear[];
const mockMine: Gear[] = [
  { ...SHOES, defaults: ["running"] },
  { ...SHOES, id: "bike", kind: "bike", name: "Canyon", defaults: ["cycling"] },
  HELMET,
];

async function shown(
  toGear: jest.Mock,
  props: Partial<Parameters<typeof RunEnd>[0]> = {},
) {
  function WithDoor() {
    const nothing = useActivitiesDoor();
    const door: ActivitiesDoor = { ...nothing, signedIn: true, owner: 7, toGear };
    return (
      <FollowsContext.Provider
        value={{
          apiUrl: "http://api",
          account: {
            state: { status: "signedIn", session: session as Session },
            sessionEnded: jest.fn(),
          },
          openProfile: () => {},
        }}
      >
        <ActivitiesContext.Provider value={door}>
          <RunEnd onSave={() => true} onDiscard={jest.fn()} health={null} {...props} />
        </ActivitiesContext.Provider>
      </FollowsContext.Provider>
    );
  }
  await render(<WithDoor />);
  await act(async () => {});
}

const save = () =>
  fireEvent.press(screen.getByRole("button", { name: "Save to My activities" }));

test("a run starts with the running shoes chosen, and they go at «Save»", async () => {
  const toGear = jest.fn();
  await shown(toGear);
  expect(screen.getByTestId("gear-picker")).toBeOnTheScreen();
  expect(screen.getByTestId(`gear-chip-${SHOES.id}`)).toBeSelected();
  expect(screen.getByTestId("gear-chip-bike")).not.toBeSelected();
  // Retired: not offered.
  expect(screen.queryByTestId(`gear-chip-${HELMET.id}`)).toBeNull();
  await save();
  expect(toGear).toHaveBeenCalledWith([SHOES.id]);
});

test("taken off, no gear goes", async () => {
  const toGear = jest.fn();
  await shown(toGear);
  await fireEvent.press(screen.getByTestId(`gear-chip-${SHOES.id}`));
  await save();
  expect(toGear).toHaveBeenCalledWith([]);
});

test("an activity from a file starts with none chosen", async () => {
  const toGear = jest.fn();
  await shown(toGear, { imported: { sport: "running" } });
  expect(screen.getByTestId(`gear-chip-${SHOES.id}`)).not.toBeSelected();
  await save();
  expect(toGear).toHaveBeenCalledWith([]);
});
