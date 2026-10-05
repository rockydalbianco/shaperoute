/**
 * The map page's script run against a stand-in for MapLibre (TASK-119): a
 * double tap told to the app in place of the zoom, only while the app asks.
 */
import vm from "node:vm";

import { buildMapPage, DOUBLE_TAP_MS, DOUBLE_TAP_PX, TAP_MS } from "./mapPage";
import { parsePageMessage, setDoubleTap, type ToPage } from "./messages";

type Touch = { clientX: number; clientY: number };
type TouchEventLike = { touches: Touch[]; timeStamp: number };
type Listener = (event: TouchEventLike) => void;

/** The page's own scripts, the ones with no `src`, run in order. */
function runPage() {
  const listeners = new Map<string, Listener>();
  const zoom = { enabled: true, changes: 0 };
  let surfacesAsked = 0;
  class Map_ {
    doubleClickZoom = {
      enable() {
        zoom.enabled = true;
        zoom.changes += 1;
      },
      disable() {
        zoom.enabled = false;
        zoom.changes += 1;
      },
    };
    addControl() {}
    once() {}
    on() {}
    getCanvasContainer() {
      surfacesAsked += 1;
      return {
        addEventListener(type: string, listener: Listener, options: unknown) {
          // Never in the way of MapLibre's own gestures.
          expect(options).toEqual({ passive: true });
          expect(listeners.has(type)).toBe(false);
          listeners.set(type, listener);
        },
      };
    }
  }
  const posted: string[] = [];
  const context: Record<string, unknown> = {
    maplibregl: { Map: Map_, LngLatBounds: class {}, AttributionControl: class {} },
    ReactNativeWebView: { postMessage: (data: string) => posted.push(data) },
  };
  context.window = context;
  vm.createContext(context);
  const scripts = [...buildMapPage().matchAll(/<script>([\s\S]*?)<\/script>/g)];
  for (const [, code] of scripts) {
    vm.runInContext(code, context);
  }
  const page = context.shaperoute as { receive: (message: ToPage) => void };
  let now = 1000;
  const fire = (type: string, touches: Touch[]) =>
    listeners.get(type)?.({ touches, timeStamp: now });
  return {
    zoom,
    listeners,
    surfacesAsked: () => surfacesAsked,
    // Through JSON, as injectJavaScript delivers it.
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    /** The double taps the app was told of. */
    doubleTaps: () =>
      posted.filter((data) => parsePageMessage(data)?.type === "doubleTap").length,
    wait: (ms: number) => {
      now += ms;
    },
    /** One finger down and up at a point, `heldMs` long. */
    tap: (x: number, y: number, heldMs = 60) => {
      fire("touchstart", [{ clientX: x, clientY: y }]);
      now += heldMs;
      fire("touchend", []);
    },
    fire,
  };
}

test("until the app asks, the map is as before: its zoom, and no listener", () => {
  const page = runPage();
  expect(page.surfacesAsked()).toBe(0);
  expect(page.zoom).toEqual({ enabled: true, changes: 0 });
  expect(page.doubleTaps()).toBe(0);
});

test("asked, a double tap is told to the app and the zoom on it is off", () => {
  const page = runPage();
  page.send(setDoubleTap(true));
  expect(page.zoom.enabled).toBe(false);
  expect([...page.listeners.keys()].sort()).toEqual([
    "touchcancel",
    "touchend",
    "touchmove",
    "touchstart",
  ]);

  page.tap(100, 200);
  expect(page.doubleTaps()).toBe(0);
  page.wait(120);
  page.tap(110, 195);
  expect(page.doubleTaps()).toBe(1);

  // A third tap right after is the first of the next two, not another one.
  page.wait(100);
  page.tap(110, 195);
  expect(page.doubleTaps()).toBe(1);
  page.wait(100);
  page.tap(110, 195);
  expect(page.doubleTaps()).toBe(2);
});

test("two taps too far apart, in time or in place, are two taps", () => {
  const page = runPage();
  page.send(setDoubleTap(true));
  page.tap(100, 200);
  page.wait(DOUBLE_TAP_MS + 1);
  page.tap(100, 200);
  expect(page.doubleTaps()).toBe(0);

  page.wait(1000);
  page.tap(100, 200);
  page.wait(100);
  page.tap(100 + DOUBLE_TAP_PX + 1, 200);
  expect(page.doubleTaps()).toBe(0);
});

test("a finger held, or dragged, is not a tap", () => {
  const page = runPage();
  page.send(setDoubleTap(true));
  page.tap(100, 200, TAP_MS + 1);
  page.wait(50);
  page.tap(100, 200);
  expect(page.doubleTaps()).toBe(0);

  page.wait(1000);
  page.tap(100, 200);
  page.wait(50);
  page.fire("touchstart", [{ clientX: 100, clientY: 200 }]);
  page.fire("touchmove", [{ clientX: 100, clientY: 200 + DOUBLE_TAP_PX + 1 }]);
  page.fire("touchend", []);
  expect(page.doubleTaps()).toBe(0);
});

test("two fingers are the zoom, never a tap", () => {
  const page = runPage();
  page.send(setDoubleTap(true));
  page.tap(100, 200);
  page.wait(50);
  page.fire("touchstart", [
    { clientX: 100, clientY: 200 },
    { clientX: 180, clientY: 260 },
  ]);
  page.fire("touchend", [{ clientX: 100, clientY: 200 }]);
  page.fire("touchend", []);
  page.wait(50);
  page.tap(100, 200);
  expect(page.doubleTaps()).toBe(0);
});

test("no longer asked, the zoom is back and double taps are not told", () => {
  const page = runPage();
  page.send(setDoubleTap(true));
  page.send(setDoubleTap(false));
  expect(page.zoom.enabled).toBe(true);
  page.tap(100, 200);
  page.wait(100);
  page.tap(100, 200);
  expect(page.doubleTaps()).toBe(0);

  // Asked again: told again, with the listeners of the first time.
  page.send(setDoubleTap(true));
  expect(page.surfacesAsked()).toBe(1);
  page.wait(1000);
  page.tap(100, 200);
  page.wait(100);
  page.tap(100, 200);
  expect(page.doubleTaps()).toBe(1);
});
