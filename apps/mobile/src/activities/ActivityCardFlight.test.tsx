import flight from "@shaperoute/shared-types/fixtures/activity-flight.json";
import activity from "@shaperoute/shared-types/fixtures/activity.json";
import myDetails from "@shaperoute/shared-types/fixtures/my-drawing-details.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { MyDrawing, Session } from "@shaperoute/shared-types";
import { render, screen, waitFor } from "@testing-library/react-native";
import { useState } from "react";

import type { Account } from "../account/useAccount";
import type { ActivityDetail } from "../api/activities";
import { DrawingsContext, useDrawingsOf } from "../social/drawingsDoor";
import { FollowsContext } from "../social/followsDoor";
import { ActivityCard } from "./ActivityCard";

// A race on foot and in the air opened from «My activities» (TASK-305 part
// R6d): under the facts the time of each, as in the Feed, and the legend of
// the two colours; any other run as before.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

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

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const URL = "http://api";
const signedIn = session as Session;
const MINE = myDetails as MyDrawing;
const RUN = { ...activity, id: MINE.key } as unknown as ActivityDetail;
const DRAWING = `/me/activities/${MINE.key}/drawing`;
const doors = { onOpened: jest.fn(), onBack: jest.fn() };

function account(): Account {
  return {
    state: { status: "signedIn", session: signedIn },
    busy: null,
    problem: null,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    editProfile: jest.fn(),
    changeEmail: jest.fn(),
    changePhone: jest.fn(),
    changeNotifications: jest.fn(),
    clearProblem: jest.fn(),
    sessionEnded: jest.fn(),
  };
}

type Route = (init?: RequestInit) => Response;

/** A fetch answering by «METHOD path», keeping each call. */
function api(routes: Record<string, Route>) {
  const names: string[] = [];
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    const name = `${init?.method ?? "GET"} ${url.replace(URL, "")}`;
    names.push(name);
    const route = routes[name];
    if (route === undefined) {
      throw new Error(`No answer for ${name}`);
    }
    return route(init);
  });
  return { fetchFn, names };
}

function Card({ fetchFn, run }: { fetchFn: jest.Mock; run: ActivityDetail }) {
  // The same account at every render, as «Profile» hands it.
  const [account_] = useState(account);
  const door = useDrawingsOf(URL, account_, doors, { fetchFn, key: null });
  return (
    <DrawingsContext.Provider value={door}>
      <FollowsContext.Provider
        value={{ apiUrl: URL, account: account_, openProfile: jest.fn() }}
      >
        <ActivityCard activity={run} onDelete={jest.fn()} />
      </FollowsContext.Provider>
    </DrawingsContext.Provider>
  );
}

const RACE = { ...RUN, activity: "paragliding", flight } as unknown as ActivityDetail;

beforeEach(() => {
  files.clear();
});

async function shown(run: ActivityDetail) {
  const { fetchFn } = api({ [`GET ${DRAWING}`]: () => Response.json(MINE) });
  await render(<Card fetchFn={fetchFn} run={run} />);
  await waitFor(() =>
    expect(screen.getByTestId("activity-card-heading")).toHaveTextContent(
      "Sunday heart by the river",
    ),
  );
}

test("a race: the time on foot and in the air, and the two colours", async () => {
  await shown(RACE);
  expect(screen.getByTestId("activity-card-split")).toHaveTextContent(
    "On foot 9:00 · In the air 10:00",
  );
  expect(screen.getByText("White: on foot. Yellow: in the air.")).toBeOnTheScreen();
  expect(screen.queryByText("White: what you ran.")).toBeNull();
});

test("any other run, or a race from an API before it: as before", async () => {
  await shown(RUN);
  expect(screen.queryByTestId("activity-card-split")).toBeNull();
  expect(screen.getByText("Yellow: the route. White: what you ran.")).toBeOnTheScreen();
});
