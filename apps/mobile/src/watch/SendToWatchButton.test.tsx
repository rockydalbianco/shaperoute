import type { LatLon } from "@shaperoute/shared-types";
import directionsBody from "@shaperoute/shared-types/fixtures/route-directions.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { Keepable } from "../favorites/favoriteRoute";
import levico from "../navigation/fixtures/levico-dead-end-u-turn.json";
import { SENT_MS, SendToWatchButton } from "./SendToWatchButton";
import type { WatchLink } from "./watchLink";
import type { WatchMessage } from "./watchMessages";
import { MAX_WATCH_POINTS } from "./watchRoute";

// «Send to watch» under the heart (TASK-370 part B3a).

const POINTS = levico.points as LatLon[];

function keepable(activity?: "cycling" | "paddling", points = POINTS): Keepable {
  return {
    id: "k1",
    request: {
      city: "",
      shape: "star",
      word: null,
      style: null,
      title: null,
      distance_m: 1000,
      route_m: 1015.1,
      similarity: 0.9,
      points,
      ...(activity !== undefined ? { activity } : {}),
    },
  };
}

function fakeLink(ready = true) {
  const transferred: WatchMessage[] = [];
  const link: WatchLink = {
    send: () => {},
    transfer: (message) => transferred.push(message),
    listen: () => () => {},
    ready: () => Promise.resolve(ready),
  };
  return { link, transferred };
}

function answering(body: unknown, ok = true) {
  return jest.fn(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(body),
    } as Response),
  );
}

async function shown(element: React.ReactElement) {
  await render(element);
  // The watch says it is ready after a promise.
  await act(async () => {});
}

/** A press, and the directions it asks for. */
async function press(label: string) {
  await fireEvent.press(screen.getByLabelText(label));
  await act(async () => {});
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("sends the route with its directions, and says so for a while", async () => {
  const { link, transferred } = fakeLink();
  const fetchFn = answering(directionsBody);
  await shown(
    <SendToWatchButton
      route={keepable()}
      link={link}
      baseUrl="http://api"
      fetchFn={fetchFn}
      now={() => 77}
    />,
  );
  await press("Send to watch");
  expect(fetchFn).toHaveBeenCalledWith(
    "http://api/route-directions",
    expect.anything(),
  );
  expect(transferred).toHaveLength(1);
  const [message] = transferred;
  expect(message).toMatchObject({ type: "route", favorite: false, at: 77 });
  if (message.type !== "route") {
    throw new Error("not a route");
  }
  expect(message.route).toMatchObject({
    key: "k1",
    title: "Star",
    activity: "running",
  });
  expect(message.route.directions.length).toBeGreaterThan(0);
  expect(screen.getByText("Sent to your watch")).toBeTruthy();
  await act(async () => jest.advanceTimersByTime(SENT_MS));
  expect(screen.queryByText("Sent to your watch")).toBeNull();
});

test("asks for no directions on the water", async () => {
  const { link, transferred } = fakeLink();
  const fetchFn = answering(directionsBody);
  await shown(
    <SendToWatchButton
      route={keepable("paddling")}
      link={link}
      baseUrl="http://api"
      fetchFn={fetchFn}
    />,
  );
  await press("Send to watch");
  expect(fetchFn).not.toHaveBeenCalled();
  expect(transferred[0]).toMatchObject({
    type: "route",
    route: { directions: [], paddle: true },
  });
});

test("sends nothing and says there is no connection when the directions do not come", async () => {
  const { link, transferred } = fakeLink();
  await shown(
    <SendToWatchButton
      route={keepable()}
      link={link}
      baseUrl="http://api"
      fetchFn={answering({}, false)}
    />,
  );
  await press("Send to watch");
  expect(transferred).toEqual([]);
  expect(
    screen.getByText("No connection. Check the network and try again."),
  ).toBeTruthy();
});

test("is not there without a watch with the app, nor for a route the watch cannot keep", async () => {
  await shown(<SendToWatchButton route={keepable()} link={fakeLink(false).link} />);
  expect(screen.queryByLabelText("Send to watch")).toBeNull();
  await shown(<SendToWatchButton route={keepable()} link={null} />);
  expect(screen.queryByLabelText("Send to watch")).toBeNull();
  const many: LatLon[] = Array.from({ length: MAX_WATCH_POINTS + 1 }, (_, i) => [
    46 + i * 1e-5,
    11,
  ]);
  await shown(
    <SendToWatchButton route={keepable(undefined, many)} link={fakeLink().link} />,
  );
  expect(screen.queryByLabelText("Send to watch")).toBeNull();
  await shown(<SendToWatchButton route={null} link={fakeLink().link} />);
  expect(screen.queryByLabelText("Send to watch")).toBeNull();
});
