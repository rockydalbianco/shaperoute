import listed from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import done from "@shaperoute/shared-types/fixtures/themed-route-job-done.json";
import { act, render, screen } from "@testing-library/react-native";

import { forgetFeedMaps } from "../feed/FeedMaps";
import { saveLanguageChoice } from "../i18n/language";
import type { Place } from "../places/photon";
import { forgetExamples } from "./exampleRoutes";
import { type Explored, optionsOf } from "./explored";
import { ExploredCard } from "./ExploredCard";
import { ExploreScreen } from "./ExploreScreen";
import {
  isRecommendedList,
  type RecommendedRoute,
  type RecommendedRouteDetail,
  routeTitle,
} from "./recommendedRoutes";
import { ThemedCard } from "./ThemedCard";
import type { ThemedResult } from "./themedRoutes";

// The shapes' names on the cards of «Explore» in the app's language
// (TASK-210, part F), and the label over the neighbours' routes. The
// words of a route stay as they are.

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
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

const fetchMock = jest.spyOn(globalThis, "fetch");

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

afterAll(() => {
  forgetExamples();
  fetchMock.mockRestore();
});

test.each([
  ["en", "dog head"],
  ["de", "Hundekopf"],
  ["it", "testa di cane"],
  ["es", "cabeza de perro"],
  ["fr", "tête de chien"],
] as const)(
  "in «%s» a route's dog head is «%s», and a word stays",
  async (language, name) => {
    await act(async () => saveLanguageChoice(language));
    expect(routeTitle({ shape: "dog_head", word: null })).toBe(name);
    expect(routeTitle({ shape: null, word: "CIAO" })).toBe("CIAO");
  },
);

test("an open route says its shape in German", async () => {
  await act(async () => saveLanguageChoice("de"));
  const [route] = isRecommendedList(listed) ? listed.routes : [];
  const [option] = optionsOf(route, detail as RecommendedRouteDetail, []);
  const explored: Explored = {
    status: "done",
    ...option,
    choices: [option.result],
    chosen: 0,
    choose: jest.fn(),
    others: [],
  };
  await render(
    <ExploredCard
      explored={explored}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onList={jest.fn()}
      start={{ status: "idle" }}
      onStart={jest.fn()}
    />,
  );
  expect(screen.getByText(/^Stern · Trento · \d+% Ähnlichkeit$/)).toBeOnTheScreen();
});

test("a themed route says its shape, and «here» with no city, in French", async () => {
  await act(async () => saveLanguageChoice("fr"));
  const result = done.result as ThemedResult;
  const request = { text: "lieux célèbres à Milan", centre: null, city: null };
  const themed = (city: string | null) => (
    <ThemedCard
      state={{ status: "done", request, result: { ...result, city } }}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onCancel={jest.fn()}
      start={{ status: "idle" }}
      onStart={jest.fn()}
    />
  );
  const { rerender } = await render(themed("Milan"));
  expect(screen.getByText("étoile · Milan · ressemble à 95 %")).toBeOnTheScreen();
  await rerender(themed(null));
  expect(screen.getByText("étoile · ici · ressemble à 95 %")).toBeOnTheScreen();
});

test("the neighbours' routes are «VICINO A BARCO», their cards in Italian", async () => {
  await act(async () => saveLanguageChoice("it"));
  forgetExamples();
  forgetFeedMaps();
  // Barco has no routes of its own: Levico's are the neighbours'.
  const levico = (listed.routes as RecommendedRoute[]).map((r) => ({
    ...r,
    city: "levico",
    away_m: r.away_m + 3336,
  }));
  fetchMock.mockImplementation((input: RequestInfo | URL) =>
    Promise.resolve(
      String(input).includes("/recommended-routes")
        ? Response.json({ routes: levico })
        : Response.json(jobDone, { status: 202 }),
    ),
  );
  const barco: Place = {
    label: "Barco, Levico Terme, Italy",
    point: [46.0003, 11.3306],
    kind: "place",
  };
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={null}
      onOpen={jest.fn()}
      city={barco}
      onCity={jest.fn()}
    />,
  );
  expect(await screen.findByText("VICINO A BARCO")).toBeOnTheScreen();
  expect(screen.queryByText("NEAR BARCO")).toBeNull();
  expect(screen.getAllByLabelText(/^stella, /).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/^Stella · /).length).toBeGreaterThan(0);
  expect(screen.queryByText(/^Star · /)).toBeNull();
});
