/**
 * «Save» from the folded end card (TASK-478 part b) does all that the
 * form's «Save» under the card does: who can see it, as chosen before the
 * card was folded, kept for the next run and sent with the run, and the run
 * written to the phone's health data after the yes.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRef } from "react";

import { NOT_CHOSEN } from "../api/drawings";
import { HEALTH_CHOICE_FILE } from "../health/healthChoice";
import type { HealthPhone } from "../health/healthPhone";
import type { SavedRun } from "../navigation/trackStore";
import { MapScreen } from "../screens/MapScreen";
import { forgetVisibilityOf, loadVisibility } from "../social/visibilityChoice";
import {
  ActivitiesContext,
  type ActivitiesDoor,
  useActivitiesDoor,
} from "./activitiesDoor";
import { EndFoldedStrip } from "./EndFoldedStrip";
import { RunEnd } from "./RunEnd";

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
  return {
    File,
    files,
    Paths: {
      document: { uri: "file:///documents/" },
      cache: { uri: "file:///cache/" },
    },
  };
});
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../map/MapKindButton", () => ({ MapKindButton: () => null }));

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

const START = Date.UTC(2026, 10, 18, 7, 0, 0);
const RUN: SavedRun = {
  version: 1,
  route: [],
  track: {
    fixes: [
      { point: [46.0679, 11.1211], timeMs: START, accuracyM: 5 },
      { point: [46.0701, 11.1243], timeMs: START + 300_000, accuracyM: 8 },
    ],
    distanceM: 1200,
  },
  status: "stopped",
};
const OWNER = 7;

function fakePhone() {
  const phone = {
    store: "apple" as const,
    available: jest.fn(async () => true),
    permission: jest.fn(async () => "allowed" as const),
    ask: jest.fn(async () => {}),
    write: jest.fn(async () => true),
  };
  return phone satisfies HealthPhone;
}

/** The end of a run as the app shows it: the card, its strip when folded. */
function End({
  door,
  health,
  onSave,
}: {
  door: Partial<ActivitiesDoor>;
  health: HealthPhone;
  onSave: () => boolean;
}) {
  const nothing = useActivitiesDoor();
  const save = useRef<(() => void) | null>(null);
  return (
    <ActivitiesContext.Provider value={{ ...nothing, signedIn: true, ...door }}>
      <MapScreen
        map={null}
        active
        onBack={jest.fn()}
        mapError={null}
        scrolls
        endStrip={(open) => (
          <EndFoldedStrip
            track={RUN.track}
            onOpen={open}
            onSave={() => {
              save.current?.();
              open();
            }}
          />
        )}
      >
        <RunEnd onSave={onSave} onDiscard={jest.fn()} health={health} saveRef={save} />
      </MapScreen>
    </ActivitiesContext.Provider>
  );
}

beforeEach(() => {
  files.clear();
  files.set("file:///documents/current-run.json", JSON.stringify(RUN));
  files.set(`file:///documents/${HEALTH_CHOICE_FILE}`, '{"on":true}');
  forgetVisibilityOf(OWNER);
});

test("«Save» from the strip: the choice of the form, and the run to Health", async () => {
  const door = { owner: OWNER, toDrawing: jest.fn(), toPhotos: jest.fn() };
  const phone = fakePhone();
  const onSave = jest.fn(() => true);
  await render(<End door={door} health={phone} onSave={onSave} />);
  expect(await screen.findByText("Also to Apple Health, with Save.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("radio", { name: "Everyone" }));
  await fireEvent.press(screen.getByLabelText("Hide the numbers"));
  // Folded: the form is out of sight, the strip's «Save» is the one.
  expect(screen.getAllByRole("button", { name: "Save to My activities" })).toHaveLength(
    1,
  );
  await fireEvent.press(screen.getByTestId("end-folded-save"));
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(door.toDrawing).toHaveBeenCalledWith({
    ...NOT_CHOSEN,
    visibility: "everyone",
  });
  expect(loadVisibility(OWNER)).toBe("everyone");
  await waitFor(() => expect(phone.write).toHaveBeenCalledTimes(1));
});

test("not kept: the card opens again and says why", async () => {
  const door = { owner: OWNER, toDrawing: jest.fn(), toPhotos: jest.fn() };
  await render(<End door={door} health={fakePhone()} onSave={() => false} />);
  await fireEvent.press(screen.getByLabelText("Hide the numbers"));
  await fireEvent.press(screen.getByTestId("end-folded-save"));
  expect(screen.queryByTestId("end-folded")).toBeNull();
  expect(screen.getByLabelText("Hide the numbers")).toBeOnTheScreen();
  expect(
    screen.getByText("This run could not be kept on the phone. Try again."),
  ).toBeOnTheScreen();
});
