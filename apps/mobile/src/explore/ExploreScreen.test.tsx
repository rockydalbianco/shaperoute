import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { FeedMapShooter, forgetFeedMaps } from "../feed/FeedMaps";
import { shapeLabel } from "../feed/FeedPost";
import type { Place } from "../places/photon";
import {
  DRAW_ORDER,
  EXAMPLE_SHAPES,
  forgetExamples,
  MORE_SHAPES,
} from "./exampleRoutes";
import { awayText, ExploreScreen, kmLabel, ownCityName } from "./ExploreScreen";
import type { RecommendedRoute } from "./recommendedRoutes";
import { CARD_MAPS_CREDIT } from "./RouteCard";
import { POSTS_SHOWN } from "./WhileDrawing";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const fetchMock = jest.spyOn(globalThis, "fetch");
const routes = list.routes as RecommendedRoute[];
/** The last shape drawn for a city: when its card is there, all are. */
const LAST = MORE_SHAPES[MORE_SHAPES.length - 1];

beforeEach(() => {
  fetchMock.mockReset();
  forgetExamples();
  forgetFeedMaps();
});

const vercelli: Place = {
  label: "Vercelli, Piedmont, Italy",
  point: [45.3252, 8.4228],
};

/** The API: an empty catalog here, and every route done at once. */
function emptyCatalog(input: RequestInfo | URL): Promise<Response> {
  const url = String(input);
  return Promise.resolve(
    url.includes("/recommended-routes")
      ? Response.json({ routes: [] })
      : Response.json(jobDone, { status: 202 }),
  );
}

function routeJobShapes(): (string | undefined)[] {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).endsWith("/route-jobs"))
    .map(([, init]) => JSON.parse(String(init?.body)).shape);
}

test("a city without recommended routes: three examples at once (TASK-143)", async () => {
  fetchMock.mockImplementation(emptyCatalog);
  const onOpen = jest.fn();
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={[46.067, 11.1215]}
      onBack={jest.fn()}
      onOpen={onOpen}
      city={vercelli}
      onCity={jest.fn()}
    />,
  );
  expect(await screen.findByText("EXAMPLES IN VERCELLI")).toBeOnTheScreen();
  const heart = await screen.findByLabelText(/^Heart, /);
  await screen.findByLabelText(/^Star, /);
  // The circle is asked first: its zone holds the others'.
  expect(routeJobShapes().slice(0, 3)).toEqual(["circle", "heart", "star"]);
  expect(screen.queryByText(/No recommended routes near this start yet/)).toBeNull();
  await fireEvent.press(heart);
  expect(onOpen.mock.calls[0][0]).toMatchObject({ shape: "heart", city: "Vercelli" });
});

/** The API with the catalog of the fixture, and every route done at once. */
function catalog(input: RequestInfo | URL): Promise<Response> {
  return Promise.resolve(
    String(input).includes("/recommended-routes")
      ? Response.json(list)
      : Response.json(jobDone, { status: 202 }),
  );
}

test("a city with recommended routes: the shapes it lacks join its cards", async () => {
  fetchMock.mockImplementation(catalog);
  const onOpen = jest.fn();
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={null}
      onBack={jest.fn()}
      onOpen={onOpen}
      city={vercelli}
      onCity={jest.fn()}
    />,
  );
  expect(await screen.findByText("Star · 5.1 km")).toBeOnTheScreen();
  const card = await screen.findByLabelText(
    new RegExp(`^${LAST.replace(/_/g, " ")}, `),
  );
  // The catalog has a star and hearts: asked are the circle, then the others.
  expect(routeJobShapes()).toEqual(["circle", ...MORE_SHAPES]);
  // One grid: the city's routes first, then what was drawn now.
  expect(screen.getAllByTestId("route-card")).toHaveLength(
    routes.length + 1 + MORE_SHAPES.length,
  );
  const order = texts();
  expect(order.findIndex((text) => text.startsWith("Circle · "))).toBeGreaterThan(
    order.indexOf("CIAO · 15.2 km"),
  );
  // As the city's own cards: the shape and the km, the city and how far,
  // and the city named as its own routes name it (the fixture's are Trento's).
  expect(screen.queryByText(/^Vercelli · /)).toBeNull();
  expect(screen.getAllByText(/^Trento · .* away$/)).toHaveLength(
    routes.length + 1 + MORE_SHAPES.length,
  );
  // No section of examples, and nothing to wait for with the feed.
  expect(screen.queryByText("EXAMPLES IN VERCELLI")).toBeNull();
  expect(screen.queryByText("MEANWHILE, FROM THE FEED")).toBeNull();
  await fireEvent.press(card);
  expect(onOpen.mock.calls[0][0]).toMatchObject({ shape: LAST, city: "trento" });
});

test("the name of a city for the shapes added to its routes", () => {
  // The route starting nearest the centre names the city...
  expect(ownCityName(routes)).toBe("trento");
  // ...unless even that one starts in another town: then the search's name.
  expect(ownCityName(routes.map((r) => ({ ...r, away_m: r.away_m + 2500 })))).toBe(
    undefined,
  );
  expect(ownCityName([])).toBe(undefined);
});

test("a city with recommended routes: the shape being drawn is the next card", async () => {
  // The catalog answers; the first route never does.
  fetchMock.mockImplementation((input) =>
    String(input).includes("/recommended-routes")
      ? Promise.resolve(Response.json(list))
      : new Promise<Response>(() => {}),
  );
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={null}
      onOpen={jest.fn()}
      city={vercelli}
      onCity={jest.fn()}
    />,
  );
  expect(await screen.findByText("Circle")).toBeOnTheScreen();
  expect(screen.getByText("Drawing…")).toBeOnTheScreen();
  // Only that one: the shapes after it are not announced.
  expect(screen.getAllByTestId("route-card")).toHaveLength(routes.length + 1);
  expect(routeJobShapes()).toEqual(["circle"]);
});

test("a city's shapes that fail say nothing when it has routes of its own", async () => {
  fetchMock.mockImplementation((input) =>
    Promise.resolve(
      String(input).includes("/recommended-routes")
        ? Response.json(list)
        : Response.json(
            {
              error: {
                code: "shape_not_drawable",
                message: "no",
                suggested_distance_m: null,
              },
            },
            { status: 422 },
          ),
    ),
  );
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={null}
      onOpen={jest.fn()}
      city={vercelli}
      onCity={jest.fn()}
    />,
  );
  await screen.findByText("Star · 5.1 km");
  await waitFor(() => expect(routeJobShapes()).toEqual(["circle", ...MORE_SHAPES]));
  expect(screen.getAllByTestId("route-card")).toHaveLength(routes.length);
  expect(screen.queryByText("Try again")).toBeNull();
  expect(screen.queryByText("Not drawn")).toBeNull();
});

test("near the start, with no city chosen, nothing is drawn", async () => {
  fetchMock.mockImplementation(catalog);
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={[46.067, 11.1215]}
      onOpen={jest.fn()}
      onCity={jest.fn()}
    />,
  );
  await screen.findByText("Star · 5.1 km");
  expect(routeJobShapes()).toEqual([]);
  expect(screen.getAllByTestId("route-card")).toHaveLength(routes.length);
});

test("while the examples are drawn, drawings of the feed to look at (TASK-163)", async () => {
  // The catalog answers; the first route never does: the map is downloading.
  fetchMock.mockImplementation((input) =>
    String(input).includes("/recommended-routes")
      ? Promise.resolve(Response.json({ routes: [] }))
      : new Promise<Response>(() => {}),
  );
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={null}
      onOpen={jest.fn()}
      city={vercelli}
      onCity={jest.fn()}
      onAsk={jest.fn()}
    />,
  );
  expect(await screen.findByText("MEANWHILE, FROM THE FEED")).toBeOnTheScreen();
  expect(screen.getByText("Drawing…")).toBeOnTheScreen();
  expect(screen.getAllByTestId("feed-post")).toHaveLength(POSTS_SHOWN);
  // Under the examples, over «Ask for a route».
  const order = texts();
  expect(order.indexOf("MEANWHILE, FROM THE FEED")).toBeGreaterThan(
    order.indexOf("EXAMPLES IN VERCELLI"),
  );
  expect(order.at(-1)).toBe("Ask for a route");
});

test("the drawings stay when the last example arrives", async () => {
  fetchMock.mockImplementation(emptyCatalog);
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={null}
      onOpen={jest.fn()}
      city={vercelli}
      onCity={jest.fn()}
    />,
  );
  await screen.findByLabelText(/^Star, /);
  // Ready above, though the other shapes are still coming.
  expect(
    screen.getByText("The shapes of this city are ready above."),
  ).toBeOnTheScreen();
  await screen.findByLabelText(new RegExp(`^${shapeLabel(LAST)}, `));
  expect(screen.queryByText("Drawing…")).toBeNull();
  expect(screen.getAllByTestId("feed-post")).toHaveLength(POSTS_SHOWN);
  expect(
    screen.getByText("The shapes of this city are ready above."),
  ).toBeOnTheScreen();
});

afterAll(() => {
  fetchMock.mockRestore();
});

test("lists the routes near the start, the best first, and opens one", async () => {
  fetchMock.mockResolvedValue(Response.json(list));
  const onOpen = jest.fn();
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={[46.067, 11.1215]}
      onBack={jest.fn()}
      onOpen={onOpen}
    />,
  );
  expect(await screen.findByText("Star · 5.1 km")).toBeOnTheScreen();
  expect(screen.getByText("CIAO · 15.2 km")).toBeOnTheScreen();
  expect(screen.getByText("100%")).toBeOnTheScreen();
  expect(screen.getAllByText("Trento · 0 m away").length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByText("Star · 5.1 km"));
  expect(onOpen).toHaveBeenCalledWith(routes[0]);
});

/** Every text on the screen, top to bottom. */
function texts(): string[] {
  return screen.getAllByText(/./).map((node) => String(node.props.children));
}

test("«Ask for a route» waits closed under the routes, and a touch opens it", async () => {
  fetchMock.mockResolvedValue(Response.json(list));
  const onAsk = jest.fn();
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={[46.067, 11.1215]}
      onOpen={jest.fn()}
      onCity={jest.fn()}
      onAsk={onAsk}
    />,
  );
  await screen.findByText("Star · 5.1 km");
  // A quiet line at the foot of the page: its categories are not there yet.
  const closed = screen.getByRole("button", { name: "Ask for a route" });
  expect(screen.queryByText("ASK FOR A ROUTE")).toBeNull();
  expect(screen.queryByText("Food")).toBeNull();
  const order = texts();
  expect(order.indexOf("Ask for a route")).toBeGreaterThan(
    order.indexOf("CIAO · 15.2 km"),
  );
  expect(order.indexOf("Ask for a route")).toBeGreaterThan(order.indexOf("CITY"));

  await fireEvent.press(closed);
  expect(screen.getByText("ASK FOR A ROUTE")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Ask for a route" })).toBeNull();
  // Opened, it is where it was: under the routes.
  expect(texts().indexOf("ASK FOR A ROUTE")).toBeGreaterThan(
    texts().indexOf("CIAO · 15.2 km"),
  );
  await fireEvent.press(screen.getByText("Food"));
  expect(onAsk).toHaveBeenCalledWith({
    text: "Food",
    centre: [46.067, 11.1215],
    city: null,
  });
});

test("«Ask for a route» is at the foot of the page also without routes", async () => {
  fetchMock.mockResolvedValue(Response.json({ routes: [] }));
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={[46.067, 11.1215]}
      onOpen={jest.fn()}
      onAsk={jest.fn()}
    />,
  );
  await screen.findByText(/No recommended routes near this start yet/);
  const order = texts();
  expect(order.at(-1)).toBe("Ask for a route");
});

test("without a way to ask there is no line to open", async () => {
  fetchMock.mockResolvedValue(Response.json(list));
  await render(
    <ExploreScreen apiUrl="http://api" near={[46.067, 11.1215]} onOpen={jest.fn()} />,
  );
  await screen.findByText("Star · 5.1 km");
  expect(screen.queryByText("Ask for a route")).toBeNull();
});

test("no filters: every route near the start is a card (TASK-176)", async () => {
  fetchMock.mockResolvedValue(Response.json(list));
  await render(
    <ExploreScreen apiUrl="http://api" near={[46.067, 11.1215]} onOpen={jest.fn()} />,
  );
  await screen.findByText("Star · 5.1 km");
  expect(screen.queryByText(/^Shape/)).toBeNull();
  expect(screen.queryByText(/^Distance/)).toBeNull();
  expect(screen.getAllByTestId("route-card")).toHaveLength(routes.length);
  // The cards are the only buttons of the page: nothing to set first.
  expect(screen.getAllByRole("button")).toHaveLength(routes.length);
});

test("after the first three examples, other shapes while they are looked at", async () => {
  fetchMock.mockImplementation(emptyCatalog);
  const onOpen = jest.fn();
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={null}
      onOpen={onOpen}
      city={vercelli}
      onCity={jest.fn()}
    />,
  );
  const card = await screen.findByLabelText(new RegExp(`^${shapeLabel(LAST)}, `));
  expect(routeJobShapes()).toEqual([...DRAW_ORDER]);
  expect(screen.getAllByTestId("route-card")).toHaveLength(
    EXAMPLE_SHAPES.length + MORE_SHAPES.length,
  );
  await fireEvent.press(card);
  expect(onOpen.mock.calls[0][0]).toMatchObject({ shape: LAST, city: "Vercelli" });
});

test("the routes are cards, two side by side between the page's margins", async () => {
  fetchMock.mockResolvedValue(Response.json(list));
  await render(
    <ExploreScreen apiUrl="http://api" near={[46.067, 11.1215]} onOpen={jest.fn()} />,
  );
  await screen.findByText("Star · 5.1 km");
  const cards = screen.getAllByTestId("route-card");
  expect(cards).toHaveLength(routes.length);
  // The window of the tests is 750 wide: 16 of margin a side, 12 between.
  for (const card of cards) {
    expect(card).toHaveStyle({ width: 353 });
  }
  expect(screen.getAllByTestId("route-card-drawing")[0]).toHaveStyle({
    width: 353,
    height: 233,
  });
});

test("the cards ask for the map under their lines (TASK-174)", async () => {
  fetchMock.mockResolvedValue(Response.json(list));
  await render(
    <>
      <FeedMapShooter width={718} height={445} />
      <ExploreScreen apiUrl="http://api" near={[46.067, 11.1215]} onOpen={jest.fn()} />
    </>,
  );
  await screen.findByText("Star · 5.1 km");
  const page = screen.getByTestId("feed-map-page", { includeHiddenElements: true });
  await fireEvent(page, "message", { nativeEvent: { data: '{"type":"ready"}' } });
  // Until a picture comes each card stays the line on the dark.
  expect(screen.queryByTestId("route-card-map")).toBeNull();
  // Whose the maps are, once, above the cards.
  expect(screen.getAllByText(CARD_MAPS_CREDIT)).toHaveLength(1);
});

test("without a start, nothing is asked", async () => {
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={null}
      onBack={jest.fn()}
      onOpen={jest.fn()}
    />,
  );
  expect(await screen.findByText(/Choose a start first/)).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("no routes near: says so", async () => {
  fetchMock.mockResolvedValue(Response.json({ routes: [] }));
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={[40, 9]}
      onBack={jest.fn()}
      onOpen={jest.fn()}
    />,
  );
  expect(
    await screen.findByText(/No recommended routes near this start yet/),
  ).toBeOnTheScreen();
  // No cards, no maps, nobody to name.
  expect(screen.queryByText(CARD_MAPS_CREDIT)).toBeNull();
});

test("a failed list says so", async () => {
  fetchMock.mockRejectedValue(new TypeError("Network request failed"));
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={[46, 11]}
      onBack={jest.fn()}
      onOpen={jest.fn()}
    />,
  );
  expect(await screen.findByText(/could not load/)).toBeOnTheScreen();
});

test("labels", () => {
  expect(kmLabel(21000)).toBe("21 km");
  expect(awayText(640)).toBe("640 m away");
  expect(awayText(1440)).toBe("1.4 km away");
});
