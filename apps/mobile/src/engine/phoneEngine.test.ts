import { pageCall } from "./page";
import {
  BOOT_TIMEOUT_MS,
  MAX_DEATHS,
  PLAN_TIMEOUT_MS,
  PhoneEngine,
  type PlanAnswer,
} from "./phoneEngine";

const ZONE = {
  name: "foot_1.00000_2.00000_3.00000_4.00000.zone.json.gz",
  uri: "file:///z",
  version: "v1",
};

/** An engine whose page is a list of the calls it got. */
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

// Every engine sets timers; none may outlive its test.
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test("nothing is mounted until a route or a warm-up asks for it", () => {
  const { engine } = withPage();
  expect(engine.mountKey).toBe(-1);
  engine.warmUp();
  expect(engine.mountKey).toBeGreaterThan(0);
});

test("a plan waits for Python, then gets the page's JSON", async () => {
  const { engine, sent, attach, say } = withPage();
  const answer = engine.plan('{"shape":"heart"}', [ZONE]);
  expect(engine.mountKey).toBeGreaterThan(0);
  attach();
  expect(sent).toEqual([
    pageCall("boot", { pyodide: "file:///p.zip", engine: "file:///e.zip" }),
  ]);
  say({ type: "ready", ms: 4200 });
  expect(sent[1]).toBe(
    pageCall("plan", { id: 1, body: '{"shape":"heart"}', zones: [ZONE] }),
  );
  say({ type: "result", id: 1, json: '{"status":"done"}', ms: 5100, memoryMb: 260 });
  await expect(answer).resolves.toEqual<PlanAnswer>({
    kind: "done",
    json: '{"status":"done"}',
    ms: 5100,
    memoryMb: 260,
  });
  expect(engine.last).toEqual({ bootMs: 4200, planMs: 5100, memoryMb: 260 });
});

test("plans run one at a time, in order", async () => {
  const { engine, sent, attach, say } = withPage();
  const first = engine.plan("a", [ZONE]);
  const second = engine.plan("b", [ZONE]);
  attach();
  say({ type: "ready", ms: 1 });
  expect(sent).toHaveLength(2);
  say({ type: "error", id: 1, error: "boom", fatal: false });
  await expect(first).resolves.toEqual({ kind: "failed", why: "boom" });
  expect(sent[2]).toContain('"body":"b"');
  say({ type: "result", id: 2, json: "{}", ms: 1, memoryMb: 1 });
  await expect(second).resolves.toMatchObject({ kind: "done" });
});

test("a page that cannot start Python sends every route to the server", async () => {
  const { engine, attach, say } = withPage();
  const answer = engine.plan("a", [ZONE]);
  attach();
  say({ type: "failed", error: "no wasm" });
  await expect(answer).resolves.toEqual({ kind: "failed", why: "no wasm" });
  expect(engine.available).toBe(false);
  expect(engine.mountKey).toBe(-1);
  await expect(engine.plan("b", [ZONE])).resolves.toMatchObject({ kind: "failed" });
});

test("when iOS closes the WebView during a route, the next one mounts a new one", async () => {
  const { engine, attach, say } = withPage();
  const answer = engine.plan("a", [ZONE]);
  const firstKey = engine.mountKey;
  attach();
  say({ type: "ready", ms: 1 });
  engine.died();
  await expect(answer).resolves.toEqual({
    kind: "failed",
    why: "the engine was closed",
  });
  expect(engine.mountKey).toBe(-1);
  void engine.plan("b", [ZONE]);
  expect(engine.mountKey).toBeGreaterThan(firstKey);
});

test(`after ${MAX_DEATHS} deaths during routes the phone stops trying`, () => {
  const { engine, attach, say } = withPage();
  for (let i = 0; i < MAX_DEATHS; i += 1) {
    void engine.plan("a", [ZONE]);
    attach();
    say({ type: "ready", ms: 1 });
    engine.died();
  }
  expect(engine.available).toBe(false);
});

test("a WebView closed while idle does not count against the phone", () => {
  const { engine, attach, say } = withPage();
  for (let i = 0; i < MAX_DEATHS + 1; i += 1) {
    engine.warmUp();
    attach();
    say({ type: "ready", ms: 1 });
    engine.died();
  }
  expect(engine.available).toBe(true);
});

test("a route that takes too long goes to the server, and the WebView is replaced", async () => {
  const { engine, attach, say } = withPage();
  const answer = engine.plan("a", [ZONE]);
  const key = engine.mountKey;
  attach();
  say({ type: "ready", ms: 1 });
  jest.advanceTimersByTime(PLAN_TIMEOUT_MS);
  await expect(answer).resolves.toEqual({
    kind: "failed",
    why: "the route took too long on the phone",
  });
  expect(engine.mountKey).toBe(-1);
  void engine.plan("b", [ZONE]);
  expect(engine.mountKey).toBeGreaterThan(key);
});

test("Python that does not start in time sends the route to the server", async () => {
  const { engine, attach } = withPage();
  const answer = engine.plan("a", [ZONE]);
  attach();
  jest.advanceTimersByTime(BOOT_TIMEOUT_MS);
  await expect(answer).resolves.toEqual({
    kind: "failed",
    why: "the engine did not start in time",
  });
});

test("an answer for a request nobody waits for any more is ignored", () => {
  const { engine, attach, say } = withPage();
  void engine.plan("a", [ZONE]);
  attach();
  say({ type: "ready", ms: 1 });
  expect(() =>
    say({ type: "result", id: 99, json: "{}", ms: 1, memoryMb: 1 }),
  ).not.toThrow();
  expect(() => engine.receive("not json")).not.toThrow();
});

test("after Python stops for good, the next request gets a new page", async () => {
  const { engine, sent, attach, say } = withPage();
  const first = engine.plan("a", [ZONE]);
  const second = engine.plan("b", [ZONE]);
  const key = engine.mountKey;
  attach();
  say({ type: "ready", ms: 1 });
  say({ type: "error", id: 1, error: "TopologyException", fatal: true });
  await expect(first).resolves.toEqual({ kind: "failed", why: "TopologyException" });
  expect(engine.mountKey).toBeGreaterThan(key);
  expect(engine.available).toBe(true);
  attach();
  say({ type: "ready", ms: 1 });
  expect(sent[sent.length - 1]).toContain('"body":"b"');
  say({ type: "result", id: 2, json: "{}", ms: 1, memoryMb: 1 });
  await expect(second).resolves.toMatchObject({ kind: "done" });
});
