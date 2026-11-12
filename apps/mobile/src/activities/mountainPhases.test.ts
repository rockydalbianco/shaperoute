import type { LatLon } from "@shaperoute/shared-types";

import {
  addFix,
  emptyTrack,
  pauseTrack,
  type Track,
} from "../navigation/trackRecorder";
import { liveVam, mountainTour, tourNow } from "./mountainPhases";

const START: LatLon = [46.4, 11.8];
const METRE = 1 / 111_195;

type Step = [northM: number, seconds: number, altitudeM?: number | null];

/** A track through `steps`: metres north, seconds, and the height if any. */
function trackOf(steps: Step[]): Track {
  return steps.reduce(
    (track, [northM, seconds, altitudeM]) =>
      addFix(track, {
        point: [START[0] + northM * METRE, START[1]],
        timeMs: seconds * 1000,
        accuracyM: 5,
        altitudeM,
      }),
    emptyTrack(),
  );
}

/** From where the last step is, `seconds` long, a fix every `every`
 * seconds, going `northM` and `upM` in all, evenly. */
function stretch(seconds: number, every: number, northM: number, upM: number) {
  return ([north, at, height]: Step): Step[] => {
    const steps: Step[] = [];
    for (let s = every; s <= seconds; s += every) {
      const share = s / seconds;
      steps.push([north + northM * share, at + s, (height ?? 0) + upM * share]);
    }
    return steps;
  };
}

/** Standing where the last step is for `seconds`: one fix at the end, a
 * few metres off, as the phone gives while still. */
function stand(seconds: number) {
  return ([north, at, height]: Step): Step[] => [[north + 6, at + seconds, height]];
}

function then(steps: Step[], ...more: ((last: Step) => Step[])[]): Step[] {
  return more.reduce((all, next) => [...all, ...next(all[all.length - 1])], steps);
}

/** Up 600 m on skins in an hour (600 m/h, 0.8 m/s along), five minutes at
 * the top, down in ten minutes, five minutes at the bottom, up 300 m again
 * in half an hour, down again. */
function twoClimbs(): Step[] {
  return then(
    [[0, 0, 1500]],
    stretch(3600, 10, 2880, 600),
    stand(300),
    stretch(600, 5, -2880, -600),
    stand(300),
    stretch(1800, 10, 1440, 300),
    stand(120),
    stretch(300, 5, -1440, -300),
  );
}

describe("a tour's phases", () => {
  it("tells the climbs from the descents, in their order", () => {
    const tour = mountainTour(trackOf(twoClimbs()));
    expect(tour?.phases.map((phase) => `${phase.kind}${phase.n}`)).toEqual([
      "climb1",
      "descent1",
      "climb2",
      "descent2",
    ]);
  });

  it("gives each climb its metres and its VAM", () => {
    const tour = mountainTour(trackOf(twoClimbs()));
    const [first, , second] = tour?.phases ?? [];
    expect(first.heightM).toBeCloseTo(600, -1);
    expect(first.vamMph).toBeGreaterThan(560);
    expect(first.vamMph).toBeLessThan(640);
    expect(second.heightM).toBeCloseTo(300, -1);
    expect(second.vamMph).toBeGreaterThan(560);
    expect(second.vamMph).toBeLessThan(640);
    // The descents have none.
    expect(tour?.phases[1].vamMph).toBeNull();
  });

  it("sums the tour: up, down, the times on the move, the top", () => {
    const tour = mountainTour(trackOf(twoClimbs()));
    expect(tour?.climbM).toBeCloseTo(900, -1);
    expect(tour?.lossM).toBeCloseTo(900, -1);
    // The standing at the top and at the bottom is not on the move.
    expect(tour?.climbMs).toBeGreaterThan(5300_000);
    expect(tour?.climbMs).toBeLessThanOrEqual(5400_000);
    expect(tour?.descentMs).toBeGreaterThan(850_000);
    expect(tour?.descentMs).toBeLessThanOrEqual(900_000);
    expect(tour?.vamMph).toBeCloseTo(600, -1);
    expect(tour?.topM).toBe(2100);
  });

  it("finds the changeovers at the turns, with their time and length", () => {
    const tour = mountainTour(trackOf(twoClimbs()));
    expect(tour?.changes.map((change) => change.kind)).toEqual(["off", "on", "off"]);
    const [off] = tour?.changes ?? [];
    // The skins came off at the top, an hour in, for five minutes.
    expect(off.atMs).toBe(3600_000);
    expect(off.ms).toBeGreaterThanOrEqual(300_000);
    expect(off.ms).toBeLessThan(320_000);
  });

  it("takes a short stop at a turn for no changeover", () => {
    const tour = mountainTour(
      trackOf(
        then(
          [[0, 0, 1500]],
          stretch(1800, 10, 1440, 300),
          stand(40),
          stretch(300, 5, -1440, -300),
        ),
      ),
    );
    expect(tour?.phases.map((phase) => phase.kind)).toEqual(["climb", "descent"]);
    expect(tour?.changes).toEqual([]);
  });

  it("keeps the bumps of a climb inside it", () => {
    // Up 200 m, down 15 m, up 200 m: one climb.
    const tour = mountainTour(
      trackOf(
        then(
          [[0, 0, 1000]],
          stretch(1200, 10, 960, 200),
          stretch(120, 10, 96, -15),
          stretch(1200, 10, 960, 200),
        ),
      ),
    );
    expect(tour?.phases.map((phase) => phase.kind)).toEqual(["climb"]);
    expect(tour?.phases[0].heightM).toBeCloseTo(400, -1);
  });

  it("sees a chairlift as a lift, not a climb", () => {
    // 300 m up in five minutes at a steady 4 m/s, then down.
    const tour = mountainTour(
      trackOf(
        then([[0, 0, 1500]], stretch(300, 10, 1200, 300), stretch(300, 5, -1440, -300)),
      ),
    );
    expect(tour?.phases.map((phase) => phase.kind)).toEqual(["lift", "descent"]);
    expect(tour?.climbM).toBe(0);
    expect(tour?.vamMph).toBeNull();
    // No skins on a lift: no changeover after it.
    expect(tour?.changes).toEqual([]);
  });

  it("has nothing to tell without heights", () => {
    const steps: Step[] = then([[0, 0, null]], stretch(600, 10, 600, 0));
    expect(
      mountainTour(trackOf(steps.map(([north, at]) => [north, at, null]))),
    ).toBeNull();
  });
});

describe("a tour as it goes", () => {
  it("is nowhere before it has gone up or down far enough", () => {
    const track = trackOf(then([[0, 0, 1500]], stretch(60, 10, 48, 10)));
    expect(tourNow(track, mountainTour(track), 60_000, false)).toBeNull();
  });

  it("is on a climb, then at a changeover when it stands at the top", () => {
    const track = trackOf(then([[0, 0, 1500]], stretch(1800, 10, 1440, 300)));
    const tour = mountainTour(track);
    expect(tourNow(track, tour, 1_800_000, false)).toBe("climb");
    expect(tourNow(track, tour, 1_800_000 + 95_000, false)).toBe("change");
    // Paused by the runner at the top: a changeover at once.
    const paused = pauseTrack(track, 1_800_000);
    expect(tourNow(paused, tour, 1_800_000, true)).toBe("change");
  });

  it("gives the VAM of the last minutes on a climb", () => {
    const track = trackOf(then([[0, 0, 1500]], stretch(1800, 10, 1440, 300)));
    const vam = liveVam(track, mountainTour(track), 1_800_000);
    expect(vam).toBeGreaterThan(560);
    expect(vam).toBeLessThan(640);
  });

  it("gives no VAM in the first two minutes of a climb, nor going down", () => {
    const early = trackOf(then([[0, 0, 1500]], stretch(100, 5, 80, 30)));
    expect(liveVam(early, mountainTour(early), 100_000)).toBeNull();
    const down = trackOf(
      then([[0, 0, 1500]], stretch(1800, 10, 1440, 300), stretch(300, 5, -1440, -300)),
    );
    expect(liveVam(down, mountainTour(down), 2_100_000)).toBeNull();
  });
});

describe("changeovers marked by hand (TASK-415 part B3)", () => {
  it("take the place of the ones found at the same turn, with their own time", () => {
    // At the top an hour in: marked from 3620 s to 3880 s.
    const tour = mountainTour(trackOf(twoClimbs()), [
      { fromMs: 3_620_000, toMs: 3_880_000 },
    ]);
    expect(tour?.changes.map((change) => change.kind)).toEqual(["off", "on", "off"]);
    expect(tour?.changes[0]).toEqual({ kind: "off", atMs: 3_620_000, ms: 260_000 });
  });

  it("count where none was found: a short stop at the foot", () => {
    // 40 s at the foot, too short to be found, marked by hand.
    const steps = then(
      [[0, 0, 1500]],
      stretch(1800, 10, 1440, 300),
      stand(300),
      stretch(300, 5, -1440, -300),
      stand(40),
      stretch(1800, 10, 1440, 300),
    );
    const found = mountainTour(trackOf(steps));
    expect(found?.changes.map((change) => change.kind)).toEqual(["off"]);
    const marked = mountainTour(trackOf(steps), [
      { fromMs: 2_405_000, toMs: 2_440_000 },
    ]);
    expect(marked?.changes.map((change) => change.kind)).toEqual(["off", "on"]);
    expect(marked?.changes[1]).toEqual({ kind: "on", atMs: 2_405_000, ms: 35_000 });
  });

  it("take the skins off at the top of the climb still going, before any descent", () => {
    const track = trackOf(then([[0, 0, 1500]], stretch(1800, 10, 1440, 300)));
    const open = [{ fromMs: 1_800_000, toMs: null }];
    const tour = mountainTour(track, open);
    expect(tour?.changes).toEqual([{ kind: "off", atMs: 1_800_000, ms: 0 }]);
    // While one is open the tour is at a changeover, moving or not.
    expect(tourNow(track, tour, 1_801_000, false, open)).toBe("change");
    expect(tourNow(track, tour, 1_801_000, false, [])).toBe("climb");
  });
});
