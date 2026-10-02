import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Place } from "../places/photon";
import { forgetExamples } from "./exampleRoutes";
import { awayText, ExploreScreen, filtered, kmLabel } from "./ExploreScreen";
import type { RecommendedRoute } from "./recommendedRoutes";
import { POSTS_SHOWN } from "./WhileDrawing";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const fetchMock = jest.spyOn(globalThis, "fetch");
const routes = list.routes as RecommendedRoute[];

beforeEach(() => {
  fetchMock.mockReset();
  forgetExamples();
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
  expect(routeJobShapes()).toEqual(["heart", "circle", "star"]);
  expect(screen.queryByText(/No recommended routes near this start yet/)).toBeNull();
  await fireEvent.press(heart);
  expect(onOpen.mock.calls[0][0]).toMatchObject({ shape: "heart", city: "Vercelli" });
});

test("a city with recommended routes asks for no example", async () => {
  fetchMock.mockResolvedValue(Response.json(list));
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={null}
      onBack={jest.fn()}
      onOpen={jest.fn()}
      city={vercelli}
      onCity={jest.fn()}
    />,
  );
  expect(await screen.findByText("Star · 5.1 km")).toBeOnTheScreen();
  expect(screen.queryByText("EXAMPLES IN VERCELLI")).toBeNull();
  expect(routeJobShapes()).toEqual([]);
  expect(screen.queryByText("MEANWHILE, FROM THE FEED")).toBeNull();
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

test("the filters keep one shape or one distance", async () => {
  fetchMock.mockResolvedValue(Response.json(list));
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={[46.067, 11.1215]}
      onBack={jest.fn()}
      onOpen={jest.fn()}
    />,
  );
  await screen.findByText("Star · 5.1 km");
  await fireEvent.press(screen.getByText("Heart"));
  expect(screen.queryByText("Star · 5.1 km")).toBeNull();
  expect(screen.getByText("Heart · 10.2 km")).toBeOnTheScreen();
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

test("labels and filters", () => {
  expect(kmLabel(21000)).toBe("21 km");
  expect(awayText(640)).toBe("640 m away");
  expect(awayText(1440)).toBe("1.4 km away");
  expect(filtered(routes, "heart", "all").map((r) => r.id)).toEqual([
    "trento-heart-10000-1",
    "trento-heart-21000-2",
  ]);
  expect(filtered(routes, "all", "5 km").map((r) => r.id)).toEqual([
    "trento-star-5000-0",
  ]);
});
