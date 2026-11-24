import type { LatLon } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { setPocketOn } from "../navigation/pocketOn";
import { cumulative } from "../navigation/progress";
import { MapView } from "./MapView";

// Under the black screen of pocket mode nobody sees the map (TASK-496): the
// page is told nothing of the run until the screen is back, and then once
// how things are. In view, a fix sends its own point, not the whole run.

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

// Nine points 111 m apart along a meridian.
const ROUTE: LatLon[] = Array.from({ length: 9 }, (_, i) => [46 + i * 0.001, 11]);
const ALONG = cumulative(ROUTE);
/** The track after `fixes` fixes, 11 m apart: the same points each time. */
const FIXES: LatLon[] = Array.from({ length: 40 }, (_, i) => [46 + i * 0.0001, 11]);
const trackOf = (fixes: number): LatLon[] => FIXES.slice(0, fixes);

type Told = { type: string; [key: string]: unknown };

/** What the page was told, in order. */
function told(): Told[] {
  return injectJavaScript.mock.calls.map(([script]) => {
    const text = script as string;
    return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Told;
  });
}

function toldOf(type: string): Told[] {
  return told().filter((message) => message.type === type);
}

/** How far along ROUTE a `showProgress` says the run is, in metres. */
function doneTo(progress: Told): number {
  const done = progress.done as number[][][];
  const last = done[done.length - 1];
  return (last[last.length - 1][1] - 46) * 111_195;
}

function pageReady() {
  return fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
}

/** The map of a run along ROUTE after `fixes` fixes. */
function running(fixes: number, facing: number | null = null) {
  const here = FIXES[fixes - 1];
  return (
    <MapView
      start={ROUTE[0]}
      route={ROUTE}
      track={trackOf(fixes)}
      following={here}
      heading={0}
      facing={facing}
      // The progress is told in steps: a fix in three moves it.
      progress={{ alongM: (here[0] - 46) * 111_195, arrived: false }}
      onError={onError}
    />
  );
}

const onError = jest.fn();

beforeEach(() => {
  injectJavaScript.mockClear();
});

afterEach(async () => {
  await act(async () => setPocketOn(false));
});

describe("in view, a run as it is recorded", () => {
  test("tells the page the whole line once, then only the new fixes", async () => {
    const { rerender } = await render(running(5));
    await pageReady();
    expect(toldOf("showTrack")).toHaveLength(1);
    expect(toldOf("showTrack")[0].coordinates).toHaveLength(5);

    await rerender(running(6));
    await rerender(running(7));
    await rerender(running(9));
    expect(toldOf("showTrack")).toHaveLength(1);
    expect(toldOf("extendTrack").map((message) => message.coordinates)).toEqual([
      [[11, FIXES[5][0]]],
      [[11, FIXES[6][0]]],
      [
        [11, FIXES[7][0]],
        [11, FIXES[8][0]],
      ],
    ]);
  });

  test("a fix sends as much late in the run as at its start", async () => {
    const { rerender } = await render(running(38));
    await pageReady();
    injectJavaScript.mockClear();
    await rerender(running(39));
    const line = injectJavaScript.mock.calls
      .map(([script]) => script as string)
      .filter((script) => script.includes("Track"));
    expect(line).toHaveLength(1);
    expect(line[0]).toContain('"type":"extendTrack"');
    expect(toldOf("extendTrack")[0].coordinates).toHaveLength(1);
  });

  test("the same line again tells nothing; another line is told whole", async () => {
    const { rerender } = await render(running(5));
    await pageReady();
    injectJavaScript.mockClear();
    // The same fixes in a new list.
    await rerender(running(5));
    expect(told().filter((message) => message.type.includes("Track"))).toEqual([]);
    // Another run: it starts somewhere else.
    const other: LatLon[] = FIXES.slice(10, 16);
    await rerender(
      <MapView
        start={ROUTE[0]}
        route={ROUTE}
        track={other}
        following={other[5]}
        onError={onError}
      />,
    );
    expect(toldOf("extendTrack")).toEqual([]);
    expect(toldOf("showTrack")).toHaveLength(1);
    expect(toldOf("showTrack")[0].coordinates).toHaveLength(6);
  });

  test("a page that loads again is told the whole line", async () => {
    const { rerender } = await render(running(5));
    await pageReady();
    await rerender(running(6));
    injectJavaScript.mockClear();
    await fireEvent(screen.getByTestId("map"), "loadStart");
    await pageReady();
    expect(toldOf("extendTrack")).toEqual([]);
    expect(toldOf("showTrack")[0].coordinates).toHaveLength(6);
    await rerender(running(7));
    expect(toldOf("extendTrack")).toHaveLength(1);
  });

  test("a track cleared and begun again is told whole", async () => {
    const { rerender } = await render(running(5));
    await pageReady();
    await rerender(
      <MapView start={ROUTE[0]} route={ROUTE} track={null} onError={onError} />,
    );
    expect(toldOf("clearTrack")).toHaveLength(1);
    injectJavaScript.mockClear();
    await rerender(running(6));
    expect(toldOf("showTrack")[0].coordinates).toHaveLength(6);
    expect(toldOf("extendTrack")).toEqual([]);
  });

  test("a track without a route, framed, is told whole each time", async () => {
    const { rerender } = await render(
      <MapView start={ROUTE[0]} route={null} track={trackOf(5)} onError={onError} />,
    );
    await pageReady();
    await rerender(
      <MapView start={ROUTE[0]} route={null} track={trackOf(6)} onError={onError} />,
    );
    expect(toldOf("extendTrack")).toEqual([]);
    expect(toldOf("showTrack").map((message) => message.frame)).toEqual([true, true]);
  });
});

describe("in pocket mode", () => {
  test("the page is told to stop blinking, and then nothing of the run", async () => {
    const { rerender } = await render(running(5, 90));
    await pageReady();
    injectJavaScript.mockClear();

    await act(async () => setPocketOn(true));
    // Once: the dashes ahead stop blinking (TASK-224).
    expect(told()).toHaveLength(1);
    expect(told()[0]).toMatchObject({ type: "showProgress", blink: false });

    injectJavaScript.mockClear();
    // The run goes on: fixes, the phone turning, the route done.
    for (let fixes = 6; fixes <= 30; fixes += 1) {
      await rerender(running(fixes, 90 + fixes));
    }
    expect(told()).toEqual([]);
  });

  test("the screen back, the page is told once how things are", async () => {
    const { rerender } = await render(running(5, 90));
    await pageReady();
    const before = doneTo(toldOf("showProgress")[0]);
    await act(async () => setPocketOn(true));
    for (let fixes = 6; fixes <= 30; fixes += 1) {
      await rerender(running(fixes, 90 + fixes));
    }
    injectJavaScript.mockClear();

    await act(async () => setPocketOn(false));
    // The fixes of the pocket, after the line the page held.
    expect(toldOf("showTrack")).toEqual([]);
    expect(toldOf("extendTrack")).toHaveLength(1);
    expect(toldOf("extendTrack")[0].coordinates).toHaveLength(25);
    // Where the runner is now, where the phone points now.
    expect(toldOf("follow")).toEqual([
      { type: "follow", lngLat: [11, FIXES[29][0]], heading: 0 },
    ]);
    expect(toldOf("face")).toEqual([{ type: "face", heading: 120 }]);
    // The route done until now, blinking again.
    const progress = toldOf("showProgress");
    expect(progress).toHaveLength(1);
    expect(progress[0].blink).toBe(true);
    expect(doneTo(progress[0])).toBeGreaterThan(before + 200);
    expect(doneTo(progress[0])).toBeLessThan(ALONG[8]);

    // And then as any run in view.
    injectJavaScript.mockClear();
    await rerender(running(31, 121));
    expect(toldOf("extendTrack")[0].coordinates).toHaveLength(1);
    expect(toldOf("follow")).toHaveLength(1);
  });

  test("nothing changed in the pocket: the screen back tells only what it must", async () => {
    await render(running(5));
    await pageReady();
    await act(async () => setPocketOn(true));
    injectJavaScript.mockClear();
    await act(async () => setPocketOn(false));
    expect(toldOf("showTrack")).toEqual([]);
    expect(toldOf("extendTrack")).toEqual([]);
    expect(toldOf("showProgress")).toHaveLength(1);
  });

  test("a page that loads again under the black screen waits for the track too", async () => {
    const { rerender } = await render(running(5));
    await pageReady();
    await act(async () => setPocketOn(true));
    await rerender(running(8));
    injectJavaScript.mockClear();
    await fireEvent(screen.getByTestId("map"), "loadStart");
    await pageReady();
    // The route, so the map is not empty, and the progress still: no run.
    expect(toldOf("showRoute")).toHaveLength(1);
    expect(toldOf("showTrack")).toEqual([]);
    expect(toldOf("follow")).toEqual([]);
    expect(toldOf("showProgress")).toEqual([
      expect.objectContaining({ type: "showProgress", blink: false }),
    ]);
    injectJavaScript.mockClear();
    await act(async () => setPocketOn(false));
    expect(toldOf("showTrack")[0].coordinates).toHaveLength(8);
    expect(toldOf("follow")).toHaveLength(1);
  });

  test("the run ended in the pocket: the track stays, the map is let go", async () => {
    const { rerender } = await render(running(5));
    await pageReady();
    await act(async () => setPocketOn(true));
    await rerender(running(9));
    injectJavaScript.mockClear();
    // Arrived: pocket mode ends with the run, and nothing is followed.
    await act(async () => setPocketOn(false));
    await rerender(
      <MapView start={ROUTE[0]} route={ROUTE} track={trackOf(9)} onError={onError} />,
    );
    expect(toldOf("extendTrack")).toHaveLength(1);
    expect(toldOf("stopFollow")).toHaveLength(1);
    expect(toldOf("clearProgress")).toHaveLength(1);
  });
});
