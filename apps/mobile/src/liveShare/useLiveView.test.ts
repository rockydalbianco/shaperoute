/**
 * A live share followed in the app (TASK-468 part B1): the rounds of GET
 * /live-shares/{id}, the pages of a long track, the end; the line under the
 * numbers.
 */
import { answers } from "../account/testing";
import { distanceLabel } from "../units/format";
import { viewLine } from "./LiveViewScreen";
import { EMPTY_VIEW, isOver, nextView } from "./useLiveView";

const API = "http://api";

function view(body: Record<string, unknown>) {
  return {
    status: 200,
    body: {
      status: "live",
      activity: "running",
      started_at: "2026-11-12T08:00:00Z",
      updated_at: "2026-11-12T08:10:00Z",
      finished_at: null,
      expires_at: "2026-11-13T08:00:00Z",
      stats: { distance_m: 3200, duration_s: 600 },
      points: [],
      last_seq: 0,
      more: false,
      ...body,
    },
  };
}

function api(fetchFn: ReturnType<typeof answers>) {
  return {
    baseUrl: API,
    token: "t",
    fetchFn: fetchFn as unknown as typeof fetch,
    key: null,
  };
}

test("the points come after the last ones, the pages at once", async () => {
  const fetchFn = answers(
    view({
      points: [
        [46.0, 11.0, 1],
        [46.1, 11.1, 2],
      ],
      last_seq: 2,
      more: true,
    }),
    view({ points: [[46.2, 11.2, 3]], last_seq: 3 }),
  );
  const { view: seen, after } = await nextView(api(fetchFn), "s1", EMPTY_VIEW, 0);
  expect(seen.points).toEqual([
    [46.0, 11.0],
    [46.1, 11.1],
    [46.2, 11.2],
  ]);
  expect(after).toBe(3);
  expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
    `${API}/live-shares/s1?after=0`,
    `${API}/live-shares/s1?after=2`,
  ]);
  const again = answers(view({ points: [], last_seq: 3 }));
  await nextView(api(again), "s1", seen, after);
  expect(again.mock.calls[0][0]).toBe(`${API}/live-shares/s1?after=3`);
});

test("one who may not see it, or gone: «Live ended»; no network: as it was", async () => {
  const gone = await nextView(
    api(answers({ status: 404, body: {} })),
    "s1",
    EMPTY_VIEW,
    0,
  );
  expect(gone.view.status).toBe("gone");
  expect(isOver(gone.view.status)).toBe(true);
  expect(viewLine(gone.view, 0)).toBe("Live ended");
  const before = { ...EMPTY_VIEW, status: "live" as const };
  const offline = await nextView(api(answers(new Error("offline"))), "s1", before, 4);
  expect(offline).toEqual({ view: before, after: 4 });
});

test("the line: updated, quiet, finished", () => {
  const at = Date.parse("2026-11-12T08:10:00Z");
  const live = {
    ...EMPTY_VIEW,
    status: "live" as const,
    updatedAt: "2026-11-12T08:10:00Z",
  };
  expect(viewLine(live, at + 10_000)).toBe("Updated 10 s ago");
  expect(viewLine(live, at + 120_000)).toMatch(/^No update since /);
  const finished = {
    ...live,
    status: "finished" as const,
    stats: { distance_m: 42195, duration_s: 12490 },
  };
  expect(viewLine(finished, at)).toBe(`Finished · ${distanceLabel(42195)} · 3:28:10`);
  expect(viewLine(EMPTY_VIEW, at)).toBeNull();
});
