/**
 * The heart rate at the end of a swim in a pool (TASK-409 part B, ADR-0334
 * precisazione D, the user's choices of 2026-11-08): «Add heart rate from
 * Apple Health» until the first tap, which asks the phone and is kept as the
 * consent; then the average, the time in each zone and where they come
 * from; «Show heart rate» in the post; the swim goes to the API with them.
 */
import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { answers } from "../account/testing";
import { NO_BODY, saveBody } from "../body/bodyProfile";
import type { HeartReader, HeartSample } from "../health/heartSamples";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { keepPoolHeartOn, loadPoolHeartOn } from "./poolHeart";
import { PoolSwimHost } from "./PoolSwimHost";
import { forgetHeldPoolSwim, startPoolSwim } from "./usePoolSwim";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
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
jest.mock("react-native-view-shot");

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const signedIn = session as Session;
const OWNER = signedIn.user.id;
const T0 = Date.UTC(2026, 10, 8, 7);
const S = 1000;

const SAVED = {
  id: "x",
  started_at: new Date(T0).toISOString(),
  duration_s: 1800,
  distance_m: 1000,
  pool_length_m: 25,
  lengths: 40,
};

function follows(): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: { status: "signedIn", session: signedIn },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

function activities(): ActivitiesDoor {
  return {
    signedIn: true,
    owner: OWNER,
    refresh: jest.fn(),
    signIn: jest.fn(),
  } as unknown as ActivitiesDoor;
}

/** A watch's readings: 10 min at 130 (zone 3 with a max of 180), 10 at
 * 150 (zone 4), 10 at 170 (zone 5), one every 5 s. */
function watch(): HeartSample[] {
  const samples: HeartSample[] = [];
  for (let s = 0; s < 1800; s += 5) {
    const bpm = s < 600 ? 130 : s < 1200 ? 150 : 170;
    samples.push({ fromMs: T0 + s * S, toMs: T0 + s * S, bpm });
  }
  return samples;
}

function reader(samples: HeartSample[] = watch()) {
  return {
    store: "apple",
    available: jest.fn(async () => true),
    ask: jest.fn(async () => {}),
    samples: jest.fn(async () => samples),
  } satisfies HeartReader;
}

async function ended(heart: HeartReader | null, fetchFn: jest.Mock = answers()) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <ActivitiesContext.Provider value={activities()}>
        <PoolSwimHost fetchFn={fetchFn} health={null} heart={heart} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => startPoolSwim(25));
  await act(async () => {
    jest.advanceTimersByTime(30 * 60_000);
  });
  await fireEvent(screen.getByLabelText("Stop"), "longPress");
  await fireEvent.changeText(screen.getByTestId("pool-lengths"), "40");
}

beforeEach(() => {
  files.clear();
  forgetHeldPoolSwim();
  jest.useFakeTimers({ now: T0 });
  // Born in 1986: a max of 180 in 2026, zones 90–108–126–144–162–180.
  saveBody({ ...NO_BODY, birthYear: 1986 });
});

afterEach(() => {
  saveBody(NO_BODY);
  jest.useRealTimers();
});

test("nothing is read before the tap; the tap asks the phone and is kept", async () => {
  const phone = reader();
  await ended(phone);
  await act(async () => {});
  expect(screen.getByText("Add heart rate from Apple Health")).toBeOnTheScreen();
  expect(phone.samples).not.toHaveBeenCalled();
  expect(screen.queryByText("Show heart rate")).toBeNull();

  await fireEvent.press(screen.getByTestId("pool-heart-add"));
  await act(async () => {});
  expect(phone.ask).toHaveBeenCalled();
  expect(loadPoolHeartOn()).toBe(true);
  expect(screen.getByTestId("pool-heart-avg")).toHaveTextContent(
    "Avg heart rate: 150 bpm",
  );
  expect(screen.getByText("Time in zones")).toBeOnTheScreen();
  expect(screen.getByTestId("pool-zone-1")).toHaveTextContent("Zone 1 Recovery · 0:00");
  expect(screen.getByTestId("pool-zone-3")).toHaveTextContent("Zone 3 Tempo · 10:00");
  expect(screen.getByTestId("pool-zone-4")).toHaveTextContent(
    "Zone 4 Threshold · 10:00",
  );
  expect(screen.getByTestId("pool-zone-5")).toHaveTextContent("Zone 5 Max · 10:00");
  expect(screen.getByText("From your watch, via Apple Health")).toBeOnTheScreen();
  expect(screen.getByText("Show heart rate")).toBeOnTheScreen();
});

test("after the consent it is read at once, and goes to the API with the swim", async () => {
  keepPoolHeartOn();
  const phone = reader();
  const fetchFn = answers({ status: 201, body: SAVED });
  await ended(phone, fetchFn);
  await act(async () => {});
  expect(phone.ask).not.toHaveBeenCalled();
  expect(screen.getByTestId("pool-heart-avg")).toHaveTextContent(
    "Avg heart rate: 150 bpm",
  );

  await fireEvent.press(screen.getByTestId("pool-save"));
  await act(async () => {});
  const [url, init] = fetchFn.mock.calls[0];
  expect(String(url)).toMatch(/\/me\/pool-swims\//);
  expect(JSON.parse(init?.body as string)).toMatchObject({
    heart_avg_bpm: 150,
    heart_max_bpm: 170,
    heart_shown: true,
  });
});

test("«Show heart rate» off hides it from others", async () => {
  keepPoolHeartOn();
  const fetchFn = answers({ status: 201, body: SAVED });
  await ended(reader(), fetchFn);
  await act(async () => {});
  const show = screen.getByRole("switch", { name: "Show heart rate" });
  expect(show).toBeChecked();
  await fireEvent.press(show);
  await fireEvent.press(screen.getByTestId("pool-save"));
  await act(async () => {});
  expect(JSON.parse(fetchFn.mock.calls[0][1]?.body as string)).toMatchObject({
    heart_avg_bpm: 150,
    heart_shown: false,
  });
});

test("a watch that wrote nothing says so, and the swim goes without it", async () => {
  keepPoolHeartOn();
  const fetchFn = answers({ status: 201, body: SAVED });
  await ended(reader([]), fetchFn);
  await act(async () => {});
  expect(
    screen.getByText("No heart rate from your watch for this swim."),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Show heart rate")).toBeNull();
  await fireEvent.press(screen.getByTestId("pool-save"));
  await act(async () => {});
  expect(JSON.parse(fetchFn.mock.calls[0][1]?.body as string)).not.toHaveProperty(
    "heart_avg_bpm",
  );
});

test("without Apple Health, nothing about the heart rate shows", async () => {
  await ended(null);
  await act(async () => {});
  expect(screen.queryByText("Add heart rate from Apple Health")).toBeNull();
  expect(screen.queryByTestId("pool-heart")).toBeNull();
});

test("without a year of birth nor a max, only the average", async () => {
  saveBody(NO_BODY);
  keepPoolHeartOn();
  await ended(reader());
  await act(async () => {});
  expect(screen.getByTestId("pool-heart-avg")).toBeOnTheScreen();
  expect(screen.queryByText("Time in zones")).toBeNull();
});
