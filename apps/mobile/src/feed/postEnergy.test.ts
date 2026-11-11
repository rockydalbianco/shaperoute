import { loadSession } from "../account/sessionStore";
import { NO_BODY, saveBody } from "../body/bodyProfile";
import { postEnergy } from "./postEnergy";
import type { SamplePost } from "./sampleFeed";

jest.mock("expo-file-system");
jest.mock("../account/sessionStore", () => ({ loadSession: jest.fn(() => null) }));

const RUN: SamplePost = {
  id: "run",
  user: "Ada_runs",
  title: "Sunday heart",
  city: "Trento",
  shape: "heart",
  route_m: 4900,
  minutes: 27,
  score: 0,
  line: [],
};

afterEach(() => {
  saveBody(NO_BODY);
  jest.mocked(loadSession).mockReturnValue(null);
});

test("a run's energy is the run screen's, from its distance (ADR-0318)", () => {
  // 4.9 km × 70 kg × 1.0 kcal.
  expect(postEnergy(RUN)).toBe("343 kcal");
  expect(postEnergy({ ...RUN, activity: "running" })).toBe("343 kcal");
});

test("a ride and a paddle have their own, from their speed", () => {
  // 15 km in 45 minutes, 20 km/h: 8 MET × 3.5 × 45 ml/kg × 5 × 70 = 441, less
  // 55 at rest.
  expect(
    postEnergy({ ...RUN, activity: "cycling", route_m: 15_000, minutes: 45 }),
  ).toBe("386 kcal");
  // 4.9 km in 27 minutes, 10.9 km/h: 12.5 MET.
  expect(postEnergy({ ...RUN, activity: "paddling" })).toBe("380 kcal");
});

test("no metres, or a ride with no time, has none", () => {
  expect(postEnergy({ ...RUN, route_m: 0 })).toBeNull();
  expect(postEnergy({ ...RUN, activity: "cycling", minutes: 0 })).toBeNull();
});

test("one's own posts are counted with the body on the phone, others' not", () => {
  saveBody({ ...NO_BODY, weightKg: 90 });
  expect(postEnergy(RUN)).toBe("343 kcal");
  jest.mocked(loadSession).mockReturnValue({
    token: "t",
    user: { username: "Ada_runs" } as never,
  });
  // 4.9 km × 90 kg.
  expect(postEnergy(RUN)).toBe("441 kcal");
});

test("a swim in a pool has its own (TASK-409 part A), one in open water a pool's", () => {
  const pool: SamplePost = { ...RUN, activity: "swimming", route_m: 1500, minutes: 40 };
  // 1500 m in 40 min at 2:40 /100 m, 70 kg (pool/poolKcal.test.ts).
  expect(postEnergy(pool)).toBe("235 kcal");
  // Others' with no body, one's own with the body on the phone.
  saveBody({ ...NO_BODY, weightKg: 80 });
  expect(postEnergy(pool)).toBe("235 kcal");
  jest.mocked(loadSession).mockReturnValue({
    token: "t",
    user: { username: "Ada_runs" } as never,
  });
  expect(postEnergy(pool)).toBe("269 kcal");
  // A swim in open water has a line, and a pool's bands (TASK-424 part
  // C2): the same pace, the same calories.
  expect(postEnergy({ ...pool, line: [[46, 11]] })).toBe("269 kcal");
});

test("every activity its calories in the Feed (TASK-424 part C2)", () => {
  const snow = {
    ...RUN,
    line: [[46, 11]] as SamplePost["line"],
    route_m: 10_000,
    minutes: 60,
  };
  // Cross-country and ski touring from the post's metres and time.
  expect(postEnergy({ ...snow, activity: "xc_skiing" })).toMatch(/^[1-9]\d* kcal$/);
  expect(postEnergy({ ...snow, activity: "ski_touring" })).toMatch(/^[1-9]\d* kcal$/);
  // Downhill counts the descents alone (part C2b): with their metres and
  // seconds, as the end of the day; without them, none.
  expect(postEnergy({ ...snow, activity: "skiing" })).toBeNull();
  const day = { ...snow, activity: "skiing" as const };
  // 285 s on the descents at 5.3 MET, 70 kg, less the rest.
  expect(postEnergy({ ...day, ski_descents: { metres: 2900, moving_s: 285 } })).toBe(
    `${Math.round(((5.3 - 1) * 3.5 * (285 / 60) * 5 * 70) / 1000)} kcal`,
  );
  // The whole day's time does not count: only the descents'.
  expect(
    postEnergy({ ...day, minutes: 600, ski_descents: { metres: 2900, moving_s: 285 } }),
  ).toBe(postEnergy({ ...day, ski_descents: { metres: 2900, moving_s: 285 } }));
  // The gym counts its sets (gymPostEnergy).
  expect(postEnergy({ ...snow, activity: "gym" })).toBeNull();
});
