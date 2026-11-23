/**
 * A swim in a pool from «Start swim» to «Save» (TASK-400 part B, ADR-0334):
 * the clock with «Pause», «Stop» held, «How many lengths?» with the
 * estimate, lengths, metres, time and pace, the 2.5 m/s limit, and «Save»,
 * which sends it to the API and to Apple Health. An app opened again finds
 * the swim where it was.
 */
import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { answers } from "../account/testing";
import type { HealthPhone } from "../health/healthPhone";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { keepPace, loadPoolChoice } from "./poolChoice";
import { poolToSend } from "./poolOutbox";
import { loadPoolSwim } from "./poolStore";
import { PoolSwimHost } from "./PoolSwimHost";
import { forgetHeldPoolSwim, startPoolSwim } from "./usePoolSwim";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../health/healthChoice", () => ({
  loadHealthOn: () => true,
  keepHealthOn: () => {},
}));
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

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const signedIn = session as Session;
const OWNER = signedIn.user.id;
const T0 = Date.UTC(2026, 10, 6, 7);
const MIN = 60_000;

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

const refresh = jest.fn();

function activities(signed = true): ActivitiesDoor {
  return {
    signedIn: signed,
    owner: signed ? OWNER : null,
    refresh,
    signIn: jest.fn(),
  } as unknown as ActivitiesDoor;
}

function phone(): HealthPhone & { write: jest.Mock } {
  return {
    store: "apple",
    available: async () => true,
    permission: async () => "allowed",
    ask: async () => {},
    write: jest.fn(async () => true),
  };
}

async function show(
  options: { fetchFn?: jest.Mock; health?: HealthPhone | null } = {},
) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <ActivitiesContext.Provider value={activities()}>
        <PoolSwimHost fetchFn={options.fetchFn} health={options.health ?? null} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
}

async function wait(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

async function stop() {
  await fireEvent(screen.getByLabelText("Stop"), "longPress");
}

beforeEach(() => {
  files.clear();
  forgetHeldPoolSwim();
  refresh.mockClear();
  jest.useFakeTimers({ now: T0 });
});

afterEach(() => {
  jest.useRealTimers();
});

test("nothing shows without a swim", async () => {
  await show();
  expect(screen.queryByTestId("pool-swim")).toBeNull();
});

test("the clock runs, «Pause» holds it, and an app opened again finds it", async () => {
  await show();
  await act(async () => startPoolSwim(25));
  expect(screen.getByText("🏊 Pool swim · 25 m")).toBeOnTheScreen();
  await wait(10 * MIN);
  expect(screen.getByTestId("pool-clock")).toHaveTextContent("10:00");
  await fireEvent.press(screen.getByTestId("pool-pause"));
  expect(screen.getByText("Paused")).toBeOnTheScreen();
  await wait(2 * MIN);
  expect(screen.getByTestId("pool-clock")).toHaveTextContent("10:00");
  await fireEvent.press(screen.getByRole("button", { name: "Resume" }));
  await wait(MIN);
  expect(screen.getByTestId("pool-clock")).toHaveTextContent("11:00");

  await act(async () => screen.unmount());
  forgetHeldPoolSwim();
  await show();
  expect(screen.getByTestId("pool-clock")).toHaveTextContent("11:00");
  expect(loadPoolSwim()?.pauses).toHaveLength(1);
});

test("at the end the estimate, the figures, and «Save» to the API and Apple Health", async () => {
  const health = phone();
  const fetchFn = answers({
    status: 201,
    body: {
      id: "x",
      started_at: new Date(T0).toISOString(),
      duration_s: 2400,
      distance_m: 1500,
      pool_length_m: 25,
      lengths: 60,
    },
  });
  await show({ fetchFn, health });
  await act(async () => startPoolSwim(25));
  await wait(40 * MIN);
  await stop();

  expect(screen.getByText("How many lengths?")).toBeOnTheScreen();
  // 40 minutes at 2:00 /100 m in 25 m: 80 lengths proposed.
  expect(screen.getByTestId("pool-lengths")).toHaveDisplayValue("80");
  expect(screen.getByTestId("pool-metres")).toHaveTextContent("2000 m");
  expect(screen.getByTestId("pool-time")).toHaveTextContent("40:00");
  expect(screen.getByTestId("pool-pace")).toHaveTextContent("2:00");

  await fireEvent.changeText(screen.getByTestId("pool-lengths"), "60");
  expect(screen.getByTestId("pool-metres")).toHaveTextContent("1500 m");
  expect(screen.getByTestId("pool-pace")).toHaveTextContent("2:40");
  await fireEvent.press(screen.getByTestId("pool-fewer"));
  await fireEvent.press(screen.getByTestId("pool-more"));
  expect(screen.getByTestId("pool-lengths")).toHaveDisplayValue("60");

  await fireEvent.press(screen.getByTestId("pool-save"));
  await act(async () => {});
  expect(screen.queryByTestId("pool-end")).toBeNull();
  expect(loadPoolSwim()).toBeNull();
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toMatch(/\/me\/pool-swims\/[a-z0-9]{8,40}$/);
  expect(JSON.parse(init?.body as string)).toMatchObject({
    pool_length_m: 25,
    lengths: 60,
  });
  expect(poolToSend(OWNER)).toEqual([]);
  expect(refresh).toHaveBeenCalled();
  expect(health.write).toHaveBeenCalledWith(
    expect.objectContaining({ distanceM: 1500, pool: { lengthM: 25 } }),
  );
  // The next estimate goes by this pace.
  expect(loadPoolChoice().paces).toEqual([160]);
});

test("the estimate goes by the paces of before", async () => {
  keepPace(100);
  await show();
  await act(async () => startPoolSwim(50));
  await wait(40 * MIN);
  await stop();
  // 2400 s at 1:40 /100 m in 50 m: 48.
  expect(screen.getByTestId("pool-lengths")).toHaveDisplayValue("48");
});

test("lengths faster than 2.5 m/s, or none, stay not valid", async () => {
  await show();
  await act(async () => startPoolSwim(25));
  await wait(MIN);
  await stop();
  // 60 s at 2.5 m/s are 150 m: 6 lengths at most.
  await fireEvent.changeText(screen.getByTestId("pool-lengths"), "7");
  expect(screen.getByTestId("pool-save")).toBeDisabled();
  expect(screen.getByTestId("pool-metres")).toHaveTextContent("–");
  await fireEvent.changeText(screen.getByTestId("pool-lengths"), "0");
  expect(screen.getByTestId("pool-save")).toBeDisabled();
  await fireEvent.changeText(screen.getByTestId("pool-lengths"), "6");
  expect(screen.getByTestId("pool-save")).toBeEnabled();
  expect(screen.getByTestId("pool-more")).toBeDisabled();
});

test("without a network the swim waits on the phone, sent the next time", async () => {
  const fetchFn = answers(new TypeError("Network request failed"));
  await show({ fetchFn });
  await act(async () => startPoolSwim(25));
  await wait(30 * MIN);
  await stop();
  await fireEvent.press(screen.getByTestId("pool-save"));
  await act(async () => {});
  expect(poolToSend(OWNER)).toHaveLength(1);
  expect(refresh).not.toHaveBeenCalled();
});

test("«Discard» asks first, then forgets the swim", async () => {
  await show();
  await act(async () => startPoolSwim(25));
  await wait(5 * MIN);
  await stop();
  await fireEvent.press(screen.getByTestId("pool-discard"));
  await fireEvent.press(screen.getByRole("button", { name: "Keep it" }));
  expect(screen.getByTestId("pool-end")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("pool-discard"));
  await fireEvent.press(screen.getByTestId("pool-discard-sure"));
  expect(screen.queryByTestId("pool-end")).toBeNull();
  expect(loadPoolSwim()).toBeNull();
});
