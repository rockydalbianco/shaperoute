import activity from "@shaperoute/shared-types/fixtures/activity.json";
import myDetails from "@shaperoute/shared-types/fixtures/my-drawing-details.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { MyDrawing, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useState } from "react";

import { apiError } from "../account/testing";
import type { Account } from "../account/useAccount";
import type { ActivityDetail } from "../api/activities";
import { DrawingsContext, useDrawingsOf } from "../social/drawingsDoor";
import { FollowsContext } from "../social/followsDoor";
import { ActivityCard } from "./ActivityCard";
import { startedLabel } from "./activityText";

// A run of «My activities» opened on the map (TASK-456): a short card under
// the map, the form of its post in the sheet «Edit post», «Delete» in «…».

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
const WHEN = startedLabel(RUN.started_at);
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

/** The API keeps what it is sent. */
const kept: Route = (init) => {
  const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
  const { tags: _tags, ...rest } = body;
  return Response.json({ ...MINE, ...rest, public: body.visibility === "everyone" });
};

function Card({ fetchFn, onDelete }: { fetchFn: jest.Mock; onDelete: () => void }) {
  // The same account at every render, as «Profile» hands it.
  const [account_] = useState(account);
  const door = useDrawingsOf(URL, account_, doors, { fetchFn, key: null });
  return (
    <DrawingsContext.Provider value={door}>
      <FollowsContext.Provider
        value={{ apiUrl: URL, account: account_, openProfile: jest.fn() }}
      >
        <ActivityCard activity={RUN} onDelete={onDelete} />
      </FollowsContext.Provider>
    </DrawingsContext.Provider>
  );
}

beforeEach(() => {
  files.clear();
});

test("the card is short: the title of the post over when and where, the facts, «Share» and «Edit post»", async () => {
  const { fetchFn } = api({ [`GET ${DRAWING}`]: () => Response.json(MINE) });
  await render(<Card fetchFn={fetchFn} onDelete={jest.fn()} />);

  // Until the API says, when it was heads the card; then the title does,
  // on the same two lines.
  await waitFor(() =>
    expect(screen.getByTestId("activity-card-heading")).toHaveTextContent(
      "Sunday heart by the river",
    ),
  );
  expect(screen.getByText(`${WHEN} · Trento · Star`)).toBeOnTheScreen();
  expect(screen.getByText("4.01 km · 19:00 · 4:45 /km")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Share" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Edit post" })).toBeOnTheScreen();
  // Nothing of the form, of «Delete» or of a second way back in sight.
  expect(screen.queryByLabelText("Title")).toBeNull();
  expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  expect(screen.queryByText("Back to the list")).toBeNull();
});

test("«Edit post» opens the whole form in a sheet, «Done» closes it, and a new title heads the card", async () => {
  const { fetchFn, names } = api({
    [`GET ${DRAWING}`]: () => Response.json(MINE),
    [`PUT ${DRAWING}`]: kept,
  });
  await render(<Card fetchFn={fetchFn} onDelete={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Edit post" }));

  expect(screen.getByRole("header", { name: "Edit post" })).toBeOnTheScreen();
  // Every field the card had: none was taken away.
  const title = await screen.findByLabelText("Title");
  expect(title.props.value).toBe("Sunday heart by the river");
  expect(screen.getByLabelText("How did it go?")).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Everyone" })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Only me" })).toBeOnTheScreen();

  await fireEvent.changeText(title, "Heart at dawn");
  await fireEvent(title, "endEditing");
  await waitFor(() =>
    expect(names.filter((n) => n === `PUT ${DRAWING}`)).toHaveLength(1),
  );

  await fireEvent.press(screen.getByRole("button", { name: "Done" }));
  await waitFor(() => expect(screen.queryByLabelText("Title")).toBeNull());
  expect(screen.getByTestId("activity-card-heading")).toHaveTextContent(
    "Heart at dawn",
  );
});

test("a run without a title is headed by when it was, with where under it", async () => {
  const { fetchFn } = api({
    [`GET ${DRAWING}`]: () => Response.json({ ...MINE, title: null }),
  });
  await render(<Card fetchFn={fetchFn} onDelete={jest.fn()} />);
  await screen.findByRole("button", { name: "Edit post" });
  expect(screen.getByTestId("activity-card-heading")).toHaveTextContent(WHEN);
  expect(screen.getByText("Trento · Star")).toBeOnTheScreen();
});

test("an API without drawings has no «Edit post»: the card is as it is without a post", async () => {
  const { fetchFn, names } = api({
    [`GET ${DRAWING}`]: () => Response.json(apiError("http_error"), { status: 404 }),
  });
  await render(<Card fetchFn={fetchFn} onDelete={jest.fn()} />);
  await waitFor(() => expect(names).toContain(`GET ${DRAWING}`));
  expect(screen.queryByRole("button", { name: "Edit post" })).toBeNull();
  expect(screen.getByTestId("activity-card-heading")).toHaveTextContent(WHEN);
  expect(screen.getByRole("button", { name: "Share" })).toBeOnTheScreen();
});

test("«Delete» is in the card's «…», and asks there before the run goes", async () => {
  const { fetchFn } = api({ [`GET ${DRAWING}`]: () => Response.json(MINE) });
  const onDelete = jest.fn();
  await render(<Card fetchFn={fetchFn} onDelete={onDelete} />);
  await screen.findByRole("button", { name: "Edit post" });

  await fireEvent.press(screen.getByRole("button", { name: "More" }));
  await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  expect(screen.getByText("Delete this run? It cannot be undone.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Keep it" }));
  await waitFor(() =>
    expect(screen.queryByText("Delete this run? It cannot be undone.")).toBeNull(),
  );
  expect(onDelete).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole("button", { name: "More" }));
  await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  await fireEvent.press(screen.getByRole("button", { name: "Delete run" }));
  expect(onDelete).toHaveBeenCalledTimes(1);
});
