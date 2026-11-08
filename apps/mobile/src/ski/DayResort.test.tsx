import resorts from "@shaperoute/shared-types/fixtures/ski-resorts.json";
import weather from "@shaperoute/shared-types/fixtures/ski-resort-weather.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { File, Paths } from "expo-file-system";

import { answers } from "../account/testing";
import type { PositionState } from "../location/useCurrentPosition";
import { SEARCH_DELAY_MS } from "../search/useDrawingSearch";
import { DayResort } from "./DayResort";
import { loadDayResort, saveDayResort, SKI_DAY_FILE } from "./skiDayStore";

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

// The resort of the day over the numbers on the snow (TASK-406 part D2).

const API = "http://api";
const HERE: PositionState = { status: "ok", point: [46.381234, 11.523456] };
const [ALPE, PASSO] = resorts.resorts;

function resort(
  fetchFn: jest.Mock,
  locate: () => Promise<PositionState> = async () => HERE,
) {
  return <DayResort apiUrl={API} fetchFn={fetchFn} apiKey={null} locate={locate} />;
}

beforeEach(() => {
  const file = new File(Paths.document, SKI_DAY_FILE);
  if (file.exists) {
    file.delete();
  }
});

test("the nearest resort is the day's, with its temperature and fresh snow", async () => {
  const fetchFn = answers(
    { status: 200, body: resorts },
    { status: 200, body: weather },
  );
  await render(resort(fetchFn));
  expect(await screen.findByText("Alpe Bianca")).toBeOnTheScreen();
  expect(fetchFn.mock.calls[0][0]).toBe(`${API}/ski-resorts?lat=46.38&lon=11.52`);
  expect(fetchFn.mock.calls[1][0]).toBe(`${API}/ski-resorts/${ALPE.id}/weather`);
  expect(await screen.findByText("2° now · 0.8 cm fresh snow")).toBeOnTheScreen();
  expect(loadDayResort()?.id).toBe(ALPE.id);
});

test("a resort kept for the day is not looked for again", async () => {
  saveDayResort(PASSO);
  const fetchFn = answers({ status: 200, body: { ...weather, resort_id: PASSO.id } });
  const locate = jest.fn(async () => HERE);
  await render(resort(fetchFn, locate));
  expect(screen.getByText("Passo Nevoso")).toBeOnTheScreen();
  await act(async () => {});
  expect(locate).not.toHaveBeenCalled();
  expect(fetchFn.mock.calls[0][0]).toBe(`${API}/ski-resorts/${PASSO.id}/weather`);
});

test("far from every resort, or without the position, none is taken", async () => {
  const far = { resorts: [PASSO] };
  await render(resort(answers({ status: 200, body: far })));
  expect(await screen.findByText("No ski resort nearby")).toBeOnTheScreen();
  expect(loadDayResort()).toBeNull();
  await render(resort(answers(), async () => ({ status: "denied" })));
  expect(await screen.findAllByText("No ski resort nearby")).not.toHaveLength(0);
});

test("«Change» picks another resort by name", async () => {
  jest.useFakeTimers();
  try {
    const fetchFn = answers(
      { status: 200, body: { resorts: [PASSO] } },
      { status: 200, body: resorts },
      { status: 200, body: resorts },
      { status: 200, body: weather },
    );
    await render(resort(fetchFn));
    expect(await screen.findByText("No ski resort nearby")).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText("Where are you skiing?"));
    await fireEvent.changeText(screen.getByTestId("day-resort-search"), "Alpe");
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS);
    });
    await fireEvent.press(await screen.findByTestId(`resort-${ALPE.id}`));
    expect(loadDayResort()?.id).toBe(ALPE.id);
    expect(await screen.findByText("Alpe Bianca")).toBeOnTheScreen();
  } finally {
    jest.useRealTimers();
  }
});
