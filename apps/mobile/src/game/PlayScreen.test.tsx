import catalog from "@shaperoute/shared-types/fixtures/game-catalog.json";
import me from "@shaperoute/shared-types/fixtures/game-me.json";
import prizes from "@shaperoute/shared-types/fixtures/game-prizes.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { GameCatalog, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import type { AccountState } from "../account/useAccount";
import { saveLanguageChoice } from "../i18n/language";
import { FollowsContext } from "../social/followsDoor";
import { saveUnitsChoice } from "../units/units";
import { forgetGameCatalog, setGameCatalog } from "./gameCatalog";
import { PlayScreen } from "./PlayScreen";
import { forgetGameMe } from "./useGameMe";
import { forgetPrizes } from "./usePrizes";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
// The phone's documents folder, in memory: the catalog, the language, the units.
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

const API = "http://api";
const SESSION = session as Session;
const SIGNED_IN: AccountState = { status: "signedIn", session: SESSION };
const SIGNED_OUT: AccountState = { status: "signedOut", notice: null };
const CATALOG = catalog as GameCatalog;
/** The catalog of an API before TASK-423: no collections, one grid. */
const GRID: GameCatalog = {
  rules_version: CATALOG.rules_version,
  shapes: CATALOG.shapes.map(({ collection: _collection, ...shape }) => shape),
};

/** The fake fetch, as the page takes it. */
const fake = (...list: Parameters<typeof answers>): jest.Mock => answers(...list);

beforeEach(() => {
  forgetGameMe();
  forgetPrizes();
  setGameCatalog(GRID);
});

afterEach(() => {
  forgetGameCatalog();
  saveLanguageChoice("phone");
  saveUnitsChoice("phone");
});

function shown(
  fetchFn: jest.Mock,
  state: AccountState = SIGNED_IN,
  onSignIn = jest.fn(),
) {
  return render(
    <FollowsContext.Provider
      value={{
        apiUrl: API,
        account: { state, sessionEnded: jest.fn() },
        openProfile: () => {},
      }}
    >
      <PlayScreen active onSignIn={onSignIn} fetchFn={fetchFn} apiKey={null} />
    </FollowsContext.Provider>,
  );
}

test("the collection shows the unlocked shapes in colour and the others with their way", async () => {
  await shown(fake({ status: 200, body: me }));
  await waitFor(() => expect(screen.getByTestId("play-totals")).toBeTruthy());
  expect(screen.getByTestId("play-totals")).toHaveTextContent("14.2 km counted so far");
  // The triangle, unlocked on the 23rd.
  // Unlocked, and still saying what it asked.
  expect(screen.getByTestId("shape-card-triangle")).toHaveTextContent(
    /Triangle.*Unlocked .* 23 Oct 2026.*5 km in total/,
  );
  expect(screen.getAllByTestId("shape-unlocked")).toHaveLength(1);
  // The hexagon, 71 % of 20 km.
  expect(screen.getByTestId("shape-card-hexagon")).toHaveTextContent(
    /Hexagon.*20 km in total.*71%.*14\.2 \/ 20 km/,
  );
  // The lightning, the only level over 1 km here: from 6:00 /km, a minute
  // slower, to 5:00 /km, a best of 5:22 is 63 % of the way (TASK-423).
  expect(screen.getByTestId("shape-card-lightning")).toHaveTextContent(
    /Lightning.*1 km under 5:00 \/km.*63%.*Best 5:22 \/km · 0:22 \/km to go/,
  );
  expect(screen.getAllByTestId("shape-locked")).toHaveLength(2);
  expect(screen.queryByTestId("play-sign-in")).toBeNull();
});

test("without an account the shapes are shown as they are, with the way to sign in", async () => {
  const onSignIn = jest.fn();
  const fetchFn = fake();
  await shown(fetchFn, SIGNED_OUT, onSignIn);
  expect(fetchFn).not.toHaveBeenCalled();
  expect(screen.getAllByTestId("shape-locked")).toHaveLength(3);
  expect(screen.getByTestId("shape-card-triangle")).toHaveTextContent(/5 km in total$/);
  expect(screen.queryByText(/%/)).toBeNull();
  await fireEvent.press(screen.getByTestId("play-sign-in"));
  expect(onSignIn).toHaveBeenCalledTimes(1);
});

test("in miles the way is said in miles", async () => {
  saveUnitsChoice("mi");
  await shown(fake({ status: 200, body: me }));
  await waitFor(() => expect(screen.getByTestId("play-totals")).toBeTruthy());
  expect(screen.getByTestId("play-totals")).toHaveTextContent("8.8 mi counted so far");
  expect(screen.getByTestId("shape-card-hexagon")).toHaveTextContent(
    /12\.4 mi in total.*8\.8 \/ 12\.4 mi/,
  );
  expect(screen.getByTestId("shape-card-lightning")).toHaveTextContent(
    /0\.6 mi under 8:03 \/mi/,
  );
});

test("the names follow the app's language", async () => {
  saveLanguageChoice("it");
  await shown(fake(), SIGNED_OUT);
  expect(screen.getByTestId("shape-card-triangle")).toHaveTextContent(/Triangolo/);
  expect(screen.getByTestId("shape-card-lightning")).toHaveTextContent(/Fulmine/);
  expect(screen.getByText("Accedi per collezionare le forme.")).toBeTruthy();
});

test("an API that cannot be reached says so, and «Try again» asks again", async () => {
  await shown(fake(new Error("offline"), { status: 200, body: me }));
  await waitFor(() => expect(screen.getByTestId("play-retry")).toBeTruthy());
  expect(
    screen.getByText(/^No connection\. Check the network and try again\./),
  ).toBeTruthy();
  await fireEvent.press(screen.getByTestId("play-retry"));
  await waitFor(() => expect(screen.getByTestId("play-totals")).toBeTruthy());
});

test("a refused session shows the account's words", async () => {
  await shown(fake({ status: 401, body: apiError("session_expired") }));
  await waitFor(() => expect(screen.getByTestId("play-retry")).toBeTruthy());
  expect(screen.getByText("Your session has ended. Log in again.")).toBeTruthy();
});

// --- In collections (TASK-423 part D) ---

test("a catalog in collections shows them, each with its count", async () => {
  setGameCatalog(CATALOG);
  await shown(fake({ status: 200, body: me }));
  await waitFor(() => expect(screen.getByTestId("play-totals")).toBeTruthy());
  expect(screen.getByTestId("collection-list")).toBeTruthy();
  expect(screen.getByTestId("collection-geometry")).toHaveTextContent(
    /Geometry.*1 \/ 2/,
  );
  expect(screen.getByTestId("collection-sky")).toHaveTextContent(/Sky.*0 \/ 1/);
  // No grid until a collection is opened.
  expect(screen.queryByTestId("shape-card-triangle")).toBeNull();
});

test("a collection opens on its shapes, and «←» goes back to the list", async () => {
  setGameCatalog(CATALOG);
  await shown(fake({ status: 200, body: me }));
  await waitFor(() => expect(screen.getByTestId("play-totals")).toBeTruthy());
  await fireEvent.press(screen.getByTestId("collection-geometry"));
  expect(screen.getByTestId("collection-page-geometry")).toBeTruthy();
  expect(screen.getByTestId("collection-count")).toHaveTextContent("1 / 2");
  expect(screen.getByTestId("shape-card-triangle")).toHaveTextContent(/Unlocked/);
  expect(screen.getByTestId("shape-card-hexagon")).toHaveTextContent(/20 km in total/);
  // The lightning is of «Sky»: not on this page.
  expect(screen.queryByTestId("shape-card-lightning")).toBeNull();
  await fireEvent.press(screen.getByTestId("collection-back"));
  expect(screen.getByTestId("collection-list")).toBeTruthy();
});

test("without an account the collections are there, none taken", async () => {
  setGameCatalog(CATALOG);
  saveLanguageChoice("it");
  await shown(fake(), SIGNED_OUT);
  expect(screen.getByTestId("collection-geometry")).toHaveTextContent(
    /Geometrie.*0 \/ 2/,
  );
  expect(screen.getByTestId("collection-sky")).toHaveTextContent(/Cielo.*0 \/ 1/);
  expect(screen.getByTestId("play-sign-in")).toBeTruthy();
});

// --- Prizes and editions (TASK-423 part E) ---

test("«Prizes» opens the frames, titles and badges, and «←» goes back", async () => {
  setGameCatalog(CATALOG);
  await shown(fake({ status: 200, body: me }, { status: 200, body: prizes }));
  await waitFor(() => expect(screen.getByTestId("play-prizes")).toBeTruthy());
  await fireEvent.press(screen.getByTestId("play-prizes"));
  await waitFor(() => expect(screen.getByTestId("prizes-editions")).toBeTruthy());
  expect(screen.getByTestId("prizes-editions")).toHaveTextContent(
    /Silver editions: 1.*Gold editions: 0/,
  );
  // The example shows the frame of «Geometry» and one badge (TASK-423 E2b).
  expect(screen.getByTestId("prize-frame-geometry")).toHaveTextContent(
    /Geometry.*On your profile/,
  );
  expect(screen.getByTestId("prize-frame-sky")).toHaveTextContent(/Sky.*0 \/ 1/);
  expect(screen.getByTestId("prize-runner")).toHaveTextContent(
    /Runner.*14.2 \/ 100 km.*100 km in total/,
  );
  expect(screen.getByTestId("prize-streak_4")).toHaveTextContent(
    /4-week streak.*On your profile/,
  );
  await fireEvent.press(screen.getByTestId("prizes-back"));
  expect(screen.getByTestId("collection-list")).toBeTruthy();
});

test("without an account there is no «Prizes»", async () => {
  setGameCatalog(CATALOG);
  await shown(fake(), SIGNED_OUT);
  expect(screen.getByTestId("collection-list")).toBeTruthy();
  expect(screen.queryByTestId("play-prizes")).toBeNull();
});

test("an unlocked pace shape shows its edition and the runs to the next", async () => {
  setGameCatalog(CATALOG);
  const silver = {
    ...me,
    shapes: me.shapes.map((shape) =>
      shape.id === "lightning"
        ? {
            ...shape,
            unlocked_at: "2026-10-24T08:00:00Z",
            progress: 1,
            edition: "silver",
            edition_runs: 4,
          }
        : shape,
    ),
  };
  await shown(fake({ status: 200, body: silver }));
  await waitFor(() => expect(screen.getByTestId("collection-sky")).toBeTruthy());
  await fireEvent.press(screen.getByTestId("collection-sky"));
  expect(screen.getByTestId("shape-card-lightning")).toHaveTextContent(
    /Lightning.*Unlocked.*1 km under 5:00 \/km.*Silver edition.*4 of 10 runs for gold/,
  );
  expect(screen.getByTestId("edition-silver")).toBeTruthy();
  // The frame of «Sky», all its shapes now unlocked.
  expect(screen.getByTestId("collection-frame")).toHaveTextContent(/Sky frame.*Earned/);
});

// --- What the profile shows (TASK-423 E2b) ---

test("a prize got, touched, goes on the profile or off it; locked ones do nothing", async () => {
  setGameCatalog(CATALOG);
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/game/me")) {
      return Response.json(me);
    }
    if (url.endsWith("/game/prizes/shown")) {
      const shown = JSON.parse(String(init?.body));
      return Response.json({ ...prizes, shown });
    }
    return Response.json(prizes);
  });
  await shown(fetchFn as unknown as jest.Mock);
  await waitFor(() => expect(screen.getByTestId("play-prizes")).toBeTruthy());
  await fireEvent.press(screen.getByTestId("play-prizes"));
  await waitFor(() => expect(screen.getByTestId("prizes-profile")).toBeTruthy());
  const puts = () =>
    fetchFn.mock.calls
      .filter(([, init]) => init?.method === "PUT")
      .map(([, init]) => JSON.parse(String(init?.body)));
  // The badge on the profile, touched: off it.
  await fireEvent.press(screen.getByTestId("prize-streak_4"));
  await waitFor(() => expect(puts()).toHaveLength(1));
  expect(puts()[0]).toEqual({ frame: "geometry", title: null, badges: [] });
  await waitFor(() =>
    expect(screen.getByTestId("prize-streak_4")).toHaveTextContent(/Earned/),
  );
  // The frame, touched: off it too.
  await fireEvent.press(screen.getByTestId("prize-frame-geometry"));
  await waitFor(() => expect(puts()).toHaveLength(2));
  expect(puts()[1]).toEqual({ frame: null, title: null, badges: [] });
  // A prize not got: nothing.
  await fireEvent.press(screen.getByTestId("prize-team_1"));
  await fireEvent.press(screen.getByTestId("prize-frame-sky"));
  expect(puts()).toHaveLength(2);
});
