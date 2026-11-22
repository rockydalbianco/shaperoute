import type { GymHistory, Session } from "@shaperoute/shared-types";
import example from "@shaperoute/shared-types/fixtures/gym-history.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { answers, apiError } from "../account/testing";
import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { GYM_HISTORY_FILE, keepHistory, keptHistory } from "./gymHistoryCache";
import { GYM_OUTBOX_FILE } from "./gymOutbox";
import { useExerciseHistory } from "./useExerciseHistory";
import type { Entry } from "./setKinds";

// TASK-483 B: the history of an exercise on the phone: kept, asked, with
// the workouts still waiting, off with an API that has none.

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
const history = example as GymHistory;
const signedIn = session as Session;
const OWNER = signedIn.user.id;
const BENCH: Entry = { exercise: "bench_press", kind: "load" };

function follows(signed = true): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: signed
        ? { status: "signedIn", session: signedIn }
        : { status: "signedOut" },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

function activities(signed = true): ActivitiesDoor {
  return {
    signedIn: signed,
    owner: signed ? OWNER : null,
  } as unknown as ActivitiesDoor;
}

function Probe({ fetchFn }: { fetchFn: typeof fetch }) {
  const state = useExerciseHistory(BENCH, fetchFn);
  return (
    <>
      <Text testID="probe">
        {JSON.stringify({
          off: state.off,
          failed: state.failed,
          count: state.history?.workouts_count ?? null,
          ids: state.history?.workouts.map((workout) => workout.id) ?? null,
          more: state.loadMore !== null,
        })}
      </Text>
      <Pressable testID="more" onPress={() => state.loadMore?.()} />
    </>
  );
}

async function show(fetchFn: jest.Mock, signed = true) {
  await render(
    <FollowsContext.Provider value={follows(signed)}>
      <ActivitiesContext.Provider value={activities(signed)}>
        <Probe fetchFn={fetchFn as unknown as typeof fetch} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
}

function probe(): Record<string, unknown> {
  return JSON.parse(String(screen.getByTestId("probe").props.children));
}

beforeEach(() => files.clear());

test("the API's history, kept for next time, the next page on asking", async () => {
  const fetchFn = answers(
    { status: 200, body: history },
    {
      status: 200,
      body: {
        ...history,
        next: undefined,
        workouts: [{ ...history.workouts[0], id: "hb00000000000001" }],
      },
    },
  );
  await show(fetchFn);
  expect(probe()).toMatchObject({ off: false, count: 3, more: true });
  expect(keptHistory(OWNER, "bench_press")).toEqual(history);
  await fireEvent.press(screen.getByTestId("more"));
  expect(String(fetchFn.mock.calls[1][0])).toBe(
    "http://api/me/gym-history?exercise=bench_press&before=hb00000000000002",
  );
  expect(probe()).toMatchObject({
    ids: ["hb00000000000003", "hb00000000000002", "hb00000000000001"],
    more: false,
  });
});

test("a workout still on the phone is in it", async () => {
  files.set(
    `file:///documents/${GYM_OUTBOX_FILE}`,
    JSON.stringify([
      {
        owner: OWNER,
        key: "hw00000000000001",
        request: {
          started_at: "2026-11-15T17:00:00Z",
          ended_at: "2026-11-15T18:00:00Z",
          sets: [
            {
              exercise: "bench_press",
              kind: "load",
              reps: 5,
              load_kg: 85,
              at_s: 60,
              live: true,
            },
          ],
        },
      },
    ]),
  );
  await show(answers({ status: 200, body: history }));
  expect(probe()).toMatchObject({ count: 4 });
  expect((probe().ids as string[])[0]).toBe("hw00000000000001");
});

test("an API without the history: off", async () => {
  await show(answers({ status: 404, body: apiError("http_error", "Not Found") }));
  expect(probe()).toMatchObject({ off: true, count: null });
});

test("no network: what the phone kept, or nothing", async () => {
  await show(answers(new TypeError("Network request failed")));
  expect(probe()).toMatchObject({ off: false, failed: true, count: null });
  keepHistory(OWNER, "bench_press", history);
  await show(answers(new TypeError("Network request failed")));
  expect(probe()).toMatchObject({ failed: false, count: 3 });
  expect(files.has(`file:///documents/${GYM_HISTORY_FILE}`)).toBe(true);
});

test("without an account: off, and nothing asked", async () => {
  const fetchFn = answers();
  await show(fetchFn, false);
  expect(probe()).toMatchObject({ off: true, count: null });
  expect(fetchFn).not.toHaveBeenCalled();
});
