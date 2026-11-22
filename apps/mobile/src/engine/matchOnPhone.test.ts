import strokeRequest from "@shaperoute/shared-types/fixtures/stroke-match-request.json";
import answered from "@shaperoute/shared-types/fixtures/stroke-match.json";
import type {
  ApiErrorCode,
  LatLon,
  StrokeMatchRequest,
  StrokeMatchResult,
} from "@shaperoute/shared-types";

import type { requestStrokeMatch, StrokeMatchOutcome } from "../api/strokeMatches";
import {
  type FetchZone,
  matchStroke,
  MatchPace,
  PHONE_MAX_STROKE_M,
  PHONE_SLOW_MS,
  strokeLength,
} from "./matchOnPhone";
import type { PhoneEngine, PlanAnswer } from "./phoneEngine";
import type { ZoneDownload, ZoneEntry } from "./zones";

jest.mock("expo-file-system", () => jest.requireActual("./memoryFiles"));
jest.mock("expo-file-system/legacy", () => ({ downloadAsync: jest.fn() }));

const URL = "http://192.168.1.23:8000";
const REQUEST = strokeRequest as StrokeMatchRequest;
const MATCH = answered as StrokeMatchResult;
const PHONE = "0123456789abcdef0123456789abcdef";

/** Trento's foot zone, which holds the fixture's stroke. */
const ZONE: ZoneEntry = {
  name: "foot_45.98370_11.00140_46.15030_11.24160.zone.json.gz",
  etag: '"e"',
  bytes: 2_700_000,
  usedAt: 1,
};

/** A stroke of about 4.6 km eastwards from the fixture's `from`, still in
 * Trento's zone: longer than the phone anchors first. */
const LONG: StrokeMatchRequest = {
  activity: "running",
  from: REQUEST.from,
  line: [0, 1, 2, 3, 4, 5, 6].map((i): LatLon => [46.0699, 11.1259 + 0.01 * i]),
};

const LONG_MATCH: StrokeMatchResult = {
  ...MATCH,
  away_m: LONG.line.map(() => 3),
};

const done = (body: unknown, ms = 300): PlanAnswer => ({
  kind: "done",
  json: JSON.stringify(body),
  ms,
  memoryMb: 200,
});

const apiError = (code: ApiErrorCode) => ({
  error: { code, message: code, suggested_distance_m: null },
});

function engine(...answers: PlanAnswer[]) {
  const match = jest.fn(async () => answers.shift() ?? done(MATCH));
  return { engine: { available: true, match } as unknown as PhoneEngine, match };
}

function server(...outcomes: StrokeMatchOutcome[]) {
  return jest.fn(
    async (..._: Parameters<typeof requestStrokeMatch>): Promise<StrokeMatchOutcome> =>
      outcomes.shift() ?? { kind: "match", match: MATCH },
  );
}

const knows = (answer: boolean | null) => jest.fn(async () => answer);

function fetchZoneAnswering(answer: ZoneDownload = { kind: "none" }) {
  return jest.fn<ReturnType<FetchZone>, Parameters<FetchZone>>(async () => answer);
}

/** The options of a test: a phone and a server that answer, no download. */
function options(over: Partial<Parameters<typeof matchStroke>[2]> = {}) {
  return {
    zones: () => [ZONE],
    pace: new MatchPace(),
    phone: () => PHONE,
    probe: knows(true),
    fetchZone: fetchZoneAnswering(),
    ...over,
  };
}

test("the fixture's stroke is short, the long one is not", () => {
  expect(strokeLength(REQUEST)).toBeLessThan(1_000);
  expect(strokeLength(LONG)).toBeGreaterThan(PHONE_MAX_STROKE_M);
});

test("with a zone saved the phone anchors the stroke, and the server is not asked", async () => {
  const phone = engine(done(MATCH));
  const ask = server();
  const probe = knows(true);

  const answer = await matchStroke(
    URL,
    REQUEST,
    options({ engine: phone.engine, ask, probe }),
  );

  expect(answer).toEqual({ kind: "match", match: MATCH, by: "phone" });
  expect(phone.match).toHaveBeenCalledWith(
    JSON.stringify(REQUEST),
    [expect.objectContaining({ name: ZONE.name })],
    expect.any(Number),
    undefined,
  );
  expect(ask).not.toHaveBeenCalled();
  expect(probe).not.toHaveBeenCalled();
});

test("a verdict of the engine on the phone is the answer, as the server's would be", async () => {
  const phone = engine(done(apiError("shape_not_drawable")));
  const ask = server();

  const answer = await matchStroke(
    URL,
    REQUEST,
    options({ engine: phone.engine, ask }),
  );

  expect(answer).toEqual({
    kind: "verdict",
    code: "shape_not_drawable",
    message: "shape_not_drawable",
  });
  expect(ask).not.toHaveBeenCalled();
});

test("a stroke out of the phone's zone goes to the server", async () => {
  const phone = engine(done(apiError("map_data_unavailable")));
  const ask = server({ kind: "match", match: MATCH });

  const answer = await matchStroke(
    URL,
    REQUEST,
    options({ engine: phone.engine, ask }),
  );

  expect(answer).toEqual({ kind: "match", match: MATCH, by: "server" });
  expect(ask).toHaveBeenCalledWith(URL, REQUEST, { signal: undefined, phone: PHONE });
});

test("a phone match with a distance for each point it did not get goes to the server", async () => {
  const phone = engine(done({ ...MATCH, away_m: [1] }));
  const ask = server({ kind: "match", match: MATCH });

  const answer = await matchStroke(
    URL,
    REQUEST,
    options({ engine: phone.engine, ask }),
  );

  expect(answer).toEqual({ kind: "match", match: MATCH, by: "server" });
});

test("a drawing far from the zones goes to the server, and its zone is downloaded", async () => {
  const phone = engine();
  const ask = server({ kind: "match", match: MATCH });
  const fetchZone = fetchZoneAnswering();

  const answer = await matchStroke(
    URL,
    REQUEST,
    options({ engine: phone.engine, ask, zones: () => [], fetchZone }),
  );

  expect(answer).toEqual({ kind: "match", match: MATCH, by: "server" });
  expect(phone.match).not.toHaveBeenCalled();
  // Around where the route starts: the end of the stroke before.
  expect(fetchZone).toHaveBeenCalledWith(URL, "foot", REQUEST.from);
});

test("one download at a time per network, while strokes keep coming", async () => {
  let finish: (download: ZoneDownload) => void = () => {};
  const fetchZone = jest.fn<ReturnType<FetchZone>, Parameters<FetchZone>>(
    () => new Promise((resolve) => (finish = resolve)),
  );
  const far = options({
    engine: engine().engine,
    ask: server(),
    zones: () => [],
    fetchZone,
  });

  await matchStroke(URL, REQUEST, far);
  await matchStroke(URL, REQUEST, far);
  expect(fetchZone).toHaveBeenCalledTimes(1);

  finish({ kind: "none" });
  await new Promise((resolve) => setImmediate(resolve));
  await matchStroke(URL, REQUEST, far);
  expect(fetchZone).toHaveBeenCalledTimes(2);
});

test("with no zone and a server older than TASK-347 the stroke stays a ghost", async () => {
  const ask = server();

  const answer = await matchStroke(
    URL,
    REQUEST,
    options({ engine: engine().engine, ask, zones: () => [], probe: knows(false) }),
  );

  expect(answer).toEqual({
    kind: "none",
    why: "the server does not anchor strokes; no zone saved around the stroke",
  });
  expect(ask).not.toHaveBeenCalled();
});

test("with no zone and no server the stroke stays a ghost, and nothing is downloaded", async () => {
  const fetchZone = fetchZoneAnswering();

  const answer = await matchStroke(
    null,
    REQUEST,
    options({ engine: engine().engine, zones: () => [], fetchZone }),
  );

  expect(answer).toEqual({
    kind: "none",
    why: "no server; no zone saved around the stroke",
  });
  expect(fetchZone).not.toHaveBeenCalled();
});

test("a long stroke goes to the server first", async () => {
  const phone = engine();
  const ask = server({ kind: "match", match: LONG_MATCH });

  const answer = await matchStroke(URL, LONG, options({ engine: phone.engine, ask }));

  expect(answer).toEqual({ kind: "match", match: LONG_MATCH, by: "server" });
  expect(phone.match).not.toHaveBeenCalled();
});

test.each<[string, StrokeMatchOutcome]>([
  ["cannot be reached", { kind: "unreachable", url: URL }],
  [
    "has no map there",
    { kind: "api_error", ...apiError("map_data_unavailable").error },
  ],
  [
    "answers too many requests",
    { kind: "api_error", ...apiError("too_many_requests").error },
  ],
])("a long stroke goes to the phone when the server %s", async (_, outcome) => {
  const phone = engine(done(LONG_MATCH));

  const answer = await matchStroke(
    URL,
    LONG,
    options({ engine: phone.engine, ask: server(outcome) }),
  );

  expect(answer).toEqual({ kind: "match", match: LONG_MATCH, by: "phone" });
});

test("a server's verdict on a long stroke is the answer, without the phone", async () => {
  const phone = engine();
  const ask = server({ kind: "api_error", ...apiError("invalid_request").error });

  const answer = await matchStroke(URL, LONG, options({ engine: phone.engine, ask }));

  expect(answer).toEqual({
    kind: "verdict",
    code: "invalid_request",
    message: "invalid_request",
  });
  expect(phone.match).not.toHaveBeenCalled();
});

test("a long stroke with an older server goes to the phone", async () => {
  const phone = engine(done(LONG_MATCH));

  const answer = await matchStroke(
    URL,
    LONG,
    options({ engine: phone.engine, probe: knows(false) }),
  );

  expect(answer).toEqual({ kind: "match", match: LONG_MATCH, by: "phone" });
});

test("the phone failing and the server unreachable leave a ghost", async () => {
  const phone = engine({ kind: "failed", why: "the engine was closed" });

  const answer = await matchStroke(
    URL,
    REQUEST,
    options({ engine: phone.engine, ask: server({ kind: "unreachable", url: URL }) }),
  );

  expect(answer).toEqual({
    kind: "none",
    why: `the engine was closed; ${URL} cannot be reached`,
  });
});

test("a slow phone sends the strokes after it to the server first", async () => {
  const pace = new MatchPace();
  const slow = PHONE_SLOW_MS + 500;
  const phone = engine(done(MATCH, slow), done(MATCH, slow));
  const ask = server();
  const each = options({ engine: phone.engine, ask, pace });

  // The first stroke reads the zone: it does not count.
  await matchStroke(URL, REQUEST, each);
  expect(pace.slow).toBe(false);
  // The second, on the zone in memory, does.
  await matchStroke(URL, REQUEST, each);
  expect(pace.slow).toBe(true);

  const third = await matchStroke(URL, REQUEST, each);
  expect(third).toEqual({ kind: "match", match: MATCH, by: "server" });
  expect(phone.match).toHaveBeenCalledTimes(2);
});

test("a quick phone keeps anchoring the strokes", async () => {
  const pace = new MatchPace();
  const phone = engine(done(MATCH, 400), done(MATCH, 400), done(MATCH, 400));
  const ask = server();
  const each = options({ engine: phone.engine, ask, pace });

  for (let i = 0; i < 3; i += 1) {
    await expect(matchStroke(URL, REQUEST, each)).resolves.toMatchObject({
      by: "phone",
    });
  }
  expect(pace.slow).toBe(false);
  expect(ask).not.toHaveBeenCalled();
});

test("paddling has no roads: a verdict, with nobody asked", async () => {
  const phone = engine();
  const ask = server();

  const answer = await matchStroke(
    URL,
    { ...REQUEST, activity: "paddling" },
    options({ engine: phone.engine, ask }),
  );

  expect(answer).toMatchObject({ kind: "verdict", code: "invalid_request" });
  expect(phone.match).not.toHaveBeenCalled();
  expect(ask).not.toHaveBeenCalled();
});

test("a stroke no longer wanted is cancelled, and the server is not asked", async () => {
  const stop = new AbortController();
  const phone = engine({ kind: "cancelled" });
  const ask = server();

  const answer = await matchStroke(
    URL,
    REQUEST,
    options({ engine: phone.engine, ask, signal: stop.signal }),
  );

  expect(answer).toEqual({ kind: "cancelled" });
  expect(ask).not.toHaveBeenCalled();
});
