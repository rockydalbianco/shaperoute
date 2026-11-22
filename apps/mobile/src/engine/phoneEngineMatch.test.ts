import { ENGINE_PAGE, pageCall } from "./page";
import {
  MATCH_TIMEOUT_MS,
  MAX_DEATHS,
  PhoneEngine,
  type PlanAnswer,
} from "./phoneEngine";

/** The engine on the phone anchoring strokes (TASK-347 part B). */

const ZONE = {
  name: "foot_1.00000_2.00000_3.00000_4.00000.zone.json.gz",
  uri: "file:///z",
  version: "v1",
};

const BODY = '{"activity":"running","line":[[46.07,11.12],[46.071,11.13]]}';

function withPage() {
  const engine = new PhoneEngine();
  const sent: string[] = [];
  const attach = () =>
    engine.attach({
      send: (js) => sent.push(js),
      pyodide: "file:///p.zip",
      engine: "file:///e.zip",
    });
  const say = (message: object) => engine.receive(JSON.stringify(message));
  return { engine, sent, attach, say };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test("the page answers a stroke with on_phone.match_json", () => {
  expect(ENGINE_PAGE).toContain('py.runPython("on_phone.match_json(BODY, GRAPHS)")');
  expect(ENGINE_PAGE).toContain("match: match");
  expect(pageCall("match", { id: 3, body: BODY, zones: [ZONE] })).toBe(
    `window.sgrava.match(${JSON.stringify({ id: 3, body: BODY, zones: [ZONE] })}); true;`,
  );
});

test("a stroke waits for Python, then gets the page's JSON", async () => {
  const { engine, sent, attach, say } = withPage();
  const answer = engine.match(BODY, [ZONE]);
  attach();
  say({ type: "ready", ms: 4200 });
  expect(sent[1]).toBe(pageCall("match", { id: 1, body: BODY, zones: [ZONE] }));
  say({ type: "result", id: 1, json: '{"points":[]}', ms: 310, memoryMb: 240 });
  await expect(answer).resolves.toEqual<PlanAnswer>({
    kind: "done",
    json: '{"points":[]}',
    ms: 310,
    memoryMb: 240,
  });
});

test("strokes wait behind a route, in order", async () => {
  const { engine, sent, attach, say } = withPage();
  void engine.plan('{"shape":"heart"}', [ZONE]);
  const stroke = engine.match(BODY, [ZONE]);
  attach();
  say({ type: "ready", ms: 1 });
  expect(sent).toHaveLength(2);
  say({ type: "result", id: 1, json: "{}", ms: 1, memoryMb: 1 });
  expect(sent[2]).toBe(pageCall("match", { id: 2, body: BODY, zones: [ZONE] }));
  say({ type: "result", id: 2, json: '{"m":1}', ms: 1, memoryMb: 1 });
  await expect(stroke).resolves.toMatchObject({ kind: "done", json: '{"m":1}' });
});

test("a stroke that takes too long goes to the server", async () => {
  const { engine, attach, say } = withPage();
  const answer = engine.match(BODY, [ZONE]);
  attach();
  say({ type: "ready", ms: 1 });
  jest.advanceTimersByTime(MATCH_TIMEOUT_MS);
  await expect(answer).resolves.toEqual({
    kind: "failed",
    why: "the route took too long on the phone",
  });
});

test("a stroke no longer wanted leaves the queue at once", async () => {
  const { engine, sent, attach, say } = withPage();
  const stop = new AbortController();
  void engine.plan("a", [ZONE]);
  const answer = engine.match(BODY, [ZONE], MATCH_TIMEOUT_MS, stop.signal);
  stop.abort();
  await expect(answer).resolves.toEqual({ kind: "cancelled" });
  attach();
  say({ type: "ready", ms: 1 });
  say({ type: "result", id: 1, json: "{}", ms: 1, memoryMb: 1 });
  expect(sent.filter((js) => js.includes("sgrava.match"))).toHaveLength(0);
});

test(`after ${MAX_DEATHS} deaths during strokes the phone stops trying`, () => {
  const { engine, attach, say } = withPage();
  for (let i = 0; i < MAX_DEATHS; i += 1) {
    void engine.match(BODY, [ZONE]);
    attach();
    say({ type: "ready", ms: 1 });
    engine.died();
  }
  expect(engine.available).toBe(false);
});
