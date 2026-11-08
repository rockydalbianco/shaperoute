import resorts from "@shaperoute/shared-types/fixtures/ski-resorts.json";
import weather from "@shaperoute/shared-types/fixtures/ski-resort-weather.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { File, Paths } from "expo-file-system";

import { answers } from "../account/testing";
import { activityKey } from "../activities/activityKey";
import type { SavedRun } from "../navigation/trackStore";
import { DrawingsContext, useDrawingsDoor } from "../social/drawingsDoor";
import { DayChoices } from "./DayChoices";
import { DayResort } from "./DayResort";
import { clearSkiDay, loadPending, queueSkiDay, SKI_DAY_FILE } from "./skiDayStore";
import { useSkiDayOutbox } from "./useSkiDayOutbox";

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

// The whole day (TASK-406 part D2): the resort found while skiing, the snow
// and the gear at the end, «Save», and the choices sent with the day's key.

const ALPE = resorts.resorts[0];
const FIRST = {
  point: [46.38, 11.52] as [number, number],
  timeMs: Date.now() - 3_600_000,
};
const RUN = { track: { fixes: [FIRST] } } as unknown as SavedRun;

function Outbox() {
  useSkiDayOutbox();
  return null;
}

function App({ keep, children }: { keep: jest.Mock; children: React.ReactNode }) {
  const nothing = useDrawingsDoor();
  return (
    <DrawingsContext.Provider value={{ ...nothing, keepSkiDay: keep }}>
      <Outbox />
      {children}
    </DrawingsContext.Provider>
  );
}

beforeEach(() => {
  const file = new File(Paths.document, SKI_DAY_FILE);
  if (file.exists) {
    file.delete();
  }
});

test("a day on the snow sends its resort, snow and gear after «Save»", async () => {
  const keep = jest.fn(async () => "sent");
  const fetchFn: jest.Mock = answers(
    { status: 200, body: resorts },
    { status: 200, body: weather },
  );
  const day = await render(
    <App keep={keep}>
      <DayResort
        apiUrl="http://api"
        fetchFn={fetchFn}
        apiKey={null}
        locate={async () => ({ status: "ok", point: [46.38, 11.52] })}
      />
    </App>,
  );
  expect(await screen.findByText("Alpe Bianca")).toBeOnTheScreen();
  await day.rerender(
    <App keep={keep}>
      <DayChoices />
    </App>,
  );
  await fireEvent.press(screen.getByTestId("snow-powder"));
  await fireEvent.changeText(screen.getByLabelText("Your gear"), "Ski Atomic Redster");
  expect(keep).not.toHaveBeenCalled();
  // «Save», then the day leaves the screen.
  await act(async () => {
    queueSkiDay(RUN);
    clearSkiDay();
  });
  expect(keep).toHaveBeenCalledWith(activityKey(FIRST), {
    resort_id: ALPE.id,
    gear: "Ski Atomic Redster",
    snow: "powder",
  });
  expect(loadPending()).toEqual([]);
});
