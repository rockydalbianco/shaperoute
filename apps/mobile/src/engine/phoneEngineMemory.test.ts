/**
 * Python's memory never shrinks (TASK-214 part F): a page left holding more
 * than MEMORY_RELEASE_MB after a route, with nothing more to do, is dropped,
 * and the next request mounts a new one.
 */
import { pageCall } from "./page";
import { MEMORY_RELEASE_MB, PhoneEngine } from "./phoneEngine";

const ZONE = {
  name: "foot_1.00000_2.00000_3.00000_4.00000.zone.json.gz",
  uri: "file:///z",
  version: "v1",
};
const BIG = MEMORY_RELEASE_MB + 600;
const SMALL = MEMORY_RELEASE_MB - 400;

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

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test("a route that leaves the page past the limit is answered, then the page goes", async () => {
  const { engine, attach, say } = withPage();
  const answer = engine.plan("a", [ZONE]);
  attach();
  say({ type: "ready", ms: 1 });
  const key = engine.mountKey;
  say({ type: "result", id: 1, json: "{}", ms: 1, memoryMb: BIG });
  await expect(answer).resolves.toMatchObject({ kind: "done", memoryMb: BIG });
  // Nothing mounted until the next request, which gets a new page.
  expect(engine.mountKey).toBe(-1);
  expect(engine.available).toBe(true);
  const next = engine.plan("b", [ZONE]);
  expect(engine.mountKey).toBeGreaterThan(key);
  const fresh: string[] = [];
  engine.attach({
    send: (js) => fresh.push(js),
    pyodide: "file:///p.zip",
    engine: "file:///e.zip",
  });
  expect(fresh).toEqual([
    pageCall("boot", { pyodide: "file:///p.zip", engine: "file:///e.zip" }),
  ]);
  say({ type: "ready", ms: 1 });
  expect(fresh[1]).toContain('"body":"b"');
  say({ type: "result", id: 2, json: "{}", ms: 1, memoryMb: SMALL });
  await expect(next).resolves.toMatchObject({ kind: "done" });
  // Under the limit the page stays for the next route.
  expect(engine.mountKey).toBeGreaterThan(key);
});

test("under the limit the page stays", async () => {
  const { engine, attach, say } = withPage();
  const answer = engine.plan("a", [ZONE]);
  attach();
  say({ type: "ready", ms: 1 });
  const key = engine.mountKey;
  say({ type: "result", id: 1, json: "{}", ms: 1, memoryMb: SMALL });
  await expect(answer).resolves.toMatchObject({ kind: "done" });
  expect(engine.mountKey).toBe(key);
});

test("with requests waiting the page stays; it goes after the last one", async () => {
  const { engine, sent, attach, say } = withPage();
  const first = engine.plan("a", [ZONE]);
  const second = engine.plan("b", [ZONE]);
  attach();
  say({ type: "ready", ms: 1 });
  const key = engine.mountKey;
  say({ type: "result", id: 1, json: "{}", ms: 1, memoryMb: BIG });
  await expect(first).resolves.toMatchObject({ kind: "done" });
  expect(engine.mountKey).toBe(key);
  expect(sent[2]).toContain('"body":"b"');
  say({ type: "result", id: 2, json: "{}", ms: 1, memoryMb: BIG });
  await expect(second).resolves.toMatchObject({ kind: "done" });
  expect(engine.mountKey).toBe(-1);
});

test("the way back and a stroke drop a page past the limit too", async () => {
  for (const ask of ["wayBack", "match"] as const) {
    const { engine, attach, say } = withPage();
    const answer = engine[ask]("a", [ZONE]);
    attach();
    say({ type: "ready", ms: 1 });
    say({ type: "result", id: 1, json: "{}", ms: 1, memoryMb: BIG });
    await expect(answer).resolves.toMatchObject({ kind: "done" });
    expect(engine.mountKey).toBe(-1);
  }
});

test("a zone read ahead stays, however big: it is for the next route", () => {
  const { engine, sent, attach, say } = withPage();
  engine.warmUp();
  attach();
  say({ type: "ready", ms: 1 });
  const key = engine.mountKey;
  engine.prepare([ZONE], "running", [46, 11]);
  expect(sent[1]).toContain("warm");
  say({ type: "result", id: 1, json: "true", ms: 1, memoryMb: BIG });
  expect(engine.mountKey).toBe(key);
});

test("dropping a page for memory is no death", async () => {
  const { engine, say } = withPage();
  for (let round = 1; round <= 3; round += 1) {
    const answer = engine.plan("a", [ZONE]);
    engine.attach({
      send: () => {},
      pyodide: "file:///p.zip",
      engine: "file:///e.zip",
    });
    say({ type: "ready", ms: 1 });
    say({ type: "result", id: round, json: "{}", ms: 1, memoryMb: BIG });
    await expect(answer).resolves.toMatchObject({ kind: "done" });
  }
  expect(engine.available).toBe(true);
});

test("no request is lost around a drop: one waiting, one asked just after", async () => {
  const { engine, sent, attach, say } = withPage();
  const big = engine.plan("big", [ZONE]);
  attach();
  say({ type: "ready", ms: 1 });
  // A zone read ahead, then a route, asked while the big route runs.
  engine.prepare([ZONE], "running", [46, 11]);
  const waiting = engine.plan("waiting", [ZONE]);
  say({ type: "result", id: 1, json: "{}", ms: 1, memoryMb: BIG });
  await expect(big).resolves.toMatchObject({ kind: "done" });
  // Requests wait: the page stays and takes them, in order.
  expect(sent[2]).toContain("warm");
  say({ type: "result", id: 2, json: "true", ms: 1, memoryMb: BIG });
  expect(sent[3]).toContain('"body":"waiting"');
  say({ type: "result", id: 3, json: "{}", ms: 1, memoryMb: BIG });
  await expect(waiting).resolves.toMatchObject({ kind: "done" });
  // Now the page goes; a route asked at once gets a new one, and an answer.
  expect(engine.mountKey).toBe(-1);
  const after = engine.plan("after", [ZONE]);
  expect(engine.mountKey).toBeGreaterThan(0);
  const fresh: string[] = [];
  engine.attach({
    send: (js) => fresh.push(js),
    pyodide: "file:///p.zip",
    engine: "file:///e.zip",
  });
  say({ type: "ready", ms: 1 });
  expect(fresh[1]).toContain('"body":"after"');
  say({ type: "result", id: 4, json: "{}", ms: 1, memoryMb: SMALL });
  await expect(after).resolves.toMatchObject({ kind: "done" });
});
