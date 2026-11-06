import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { type WayBackShown } from "../navigation/wayBackShown";
import { cumulative } from "../navigation/progress";
import { MapView } from "./MapView";
import { showRejoin, showRejoinLine } from "./messages";

// Off the route with the way back on the streets (TASK-314): the dots go
// from the runner along the way, in place of the straight line of TASK-303;
// without it, straight again.

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const ROUTE: LatLon[] = [
  [46.0, 11.0],
  [46.002, 11.0],
  [46.004, 11.0],
];
const HERE: LatLon = [46.0012, 11.0013];
const THERE: LatLon = [46.0012, 11.0];
/** East to a street, along it north, then west back to the route. */
const WAY: LatLon[] = [HERE, [46.0012, 11.0016], [46.0018, 11.0016], [46.0018, 11.0]];

function wayBack(alongM: number): WayBackShown {
  return {
    points: WAY,
    along: cumulative(WAY),
    directions: [],
    rejoinAlongM: 200,
    alongM,
    next: 0,
    saidUpTo: -1,
    leftFixes: 0,
  };
}

function pagePosts(data: string) {
  return fireEvent(screen.getByTestId("map"), "message", { nativeEvent: { data } });
}

/** The messages of a type handed to the page, in order. */
function messages(type: string): Record<string, unknown>[] {
  return injectJavaScript.mock.calls
    .map(([script]: [string]) => /receive\((.*)\); true;$/.exec(script)?.[1])
    .filter((json: string | undefined): json is string => json !== undefined)
    .map((json: string) => JSON.parse(json) as Record<string, unknown>)
    .filter((message: Record<string, unknown>) => message.type === type);
}

const lngLat = ([lat, lon]: LatLon) => [lon, lat];

beforeEach(() => {
  injectJavaScript.mockClear();
});

test("the dots go along the way back, and straight again without it", async () => {
  const { rerender } = await render(
    <MapView
      start={null}
      route={ROUTE}
      following={HERE}
      progress={{
        alongM: 300,
        arrived: false,
        rejoin: { from: HERE, to: THERE },
        wayBack: wayBack(0),
      }}
      onError={jest.fn()}
    />,
  );
  await pagePosts('{"type":"ready"}');
  // From the runner, where they are on the way, then the rest of it.
  expect(messages("showRejoin")).toEqual([
    { type: "showRejoin", line: [HERE, HERE, ...WAY.slice(1)].map(lngLat) },
  ]);
  // Further along the way: what is behind is not drawn.
  const further: LatLon = [46.0014, 11.0017];
  const along = cumulative(WAY);
  await rerender(
    <MapView
      start={null}
      route={ROUTE}
      following={further}
      progress={{
        alongM: 300,
        arrived: false,
        rejoin: { from: further, to: THERE },
        wayBack: wayBack(along[1] + 22),
      }}
      onError={jest.fn()}
    />,
  );
  const line = messages("showRejoin")[1].line as number[][];
  expect(line[0]).toEqual(lngLat(further));
  expect(line[1][0]).toBeCloseTo(11.0016, 6);
  expect(line.slice(2)).toEqual(WAY.slice(2).map(lngLat));
  // No way any more: straight, as TASK-303 drew it.
  await rerender(
    <MapView
      start={null}
      route={ROUTE}
      following={further}
      progress={{ alongM: 300, arrived: false, rejoin: { from: further, to: THERE } }}
      onError={jest.fn()}
    />,
  );
  expect(messages("showRejoin")[2]).toEqual({
    type: "showRejoin",
    line: [lngLat(further), lngLat(THERE)],
  });
  // Back on the route: the dots go.
  await rerender(
    <MapView
      start={null}
      route={ROUTE}
      following={THERE}
      progress={{ alongM: 320, arrived: false, rejoin: null, wayBack: null }}
      onError={jest.fn()}
    />,
  );
  expect(messages("clearRejoin")).toHaveLength(1);
});

test("the straight line is a way of two points", () => {
  expect(showRejoin(HERE, THERE)).toEqual(showRejoinLine([HERE, THERE]));
});
