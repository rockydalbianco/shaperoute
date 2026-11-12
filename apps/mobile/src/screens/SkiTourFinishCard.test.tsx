/**
 * The end of a ski tour and the tour as it goes (TASK-415 part B,
 * ADR-0344): the metres climbed in large, the times up and down, the VAM,
 * the phases with their changeovers; over the run's numbers, the phase,
 * the VAM of the last minutes, the metres climbed and the height.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { forgetSkinChanges, loadSkinChanges } from "../activities/skinChanges";
import type { FreeRun } from "../navigation/freeRun";
import { addFix, emptyTrack, type Track } from "../navigation/trackRecorder";
import type { Sport } from "../settings/sport";
import { saveUnitsChoice } from "../units/units";
import { FreeFinishCard, FreeRunCard } from "./FreeRunScreen";
import { SkiTourFinishCard } from "./SkiTourFinishCard";
import { SkiTourLive } from "./SkiTourLive";

let mockSport: Sport = "skimo";
jest.mock("../settings/useSport", () => ({ useSport: () => mockSport }));

jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(() => Promise.resolve(0.6)),
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

const START: LatLon = [46.4, 11.8];
const METRE = 1 / 111_195;

/** A tour: up `steps` in turn, each `[seconds, every, northM, upM]`; an
 * `every` of 0 stands still for the seconds, one fix at the end. */
function tourOf(
  steps: [seconds: number, every: number, northM: number, upM: number][],
  heights = true,
): Track {
  let north = 0;
  let height = 1500;
  let at = 0;
  let track = addFix(emptyTrack(), {
    point: START,
    timeMs: 0,
    accuracyM: 5,
    altitudeM: heights ? height : null,
  });
  for (const [seconds, every, northM, upM] of steps) {
    const times = every === 0 ? [seconds] : [];
    for (let s = every; every > 0 && s <= seconds; s += every) {
      times.push(s);
    }
    for (const s of times) {
      const share = every === 0 ? 0 : s / seconds;
      track = addFix(track, {
        point: [
          START[0] + (north + northM * share + (every === 0 ? 6 : 0)) * METRE,
          START[1],
        ],
        timeMs: (at + s) * 1000,
        accuracyM: 5,
        altitudeM: heights ? height + upM * share : null,
      });
    }
    north += northM + (every === 0 ? 6 : 0);
    height += upM;
    at += seconds;
  }
  return track;
}

/** Up 600 m in an hour, five minutes at the top, down in ten minutes. */
function oneClimb(heights = true): Track {
  return tourOf(
    [
      [3600, 10, 2880, 600],
      [300, 0, 0, 0],
      [600, 5, -2880, -600],
    ],
    heights,
  );
}

function tourRun(track: Track): FreeRun {
  return { version: 1, route: [], track, status: "stopped" };
}

afterEach(() => {
  forgetSkinChanges();
  jest.restoreAllMocks();
  mockSport = "skimo";
  saveUnitsChoice("km");
});

test("the end of a tour has the metres climbed in large, and its numbers", async () => {
  await render(
    <SkiTourFinishCard
      run={tourRun(oneClimb())}
      activity="ski_touring"
      onDone={jest.fn()}
    />,
  );
  expect(screen.getByLabelText("Climbed: 600 m")).toBeOnTheScreen();
  expect(screen.getByLabelText("Elev. loss: 600 m")).toBeOnTheScreen();
  expect(screen.getByLabelText("Time up: 1 h 00 min")).toBeOnTheScreen();
  expect(screen.getByLabelText("Time down: 10 min")).toBeOnTheScreen();
  expect(screen.getByLabelText("Avg VAM: 600 m/h")).toBeOnTheScreen();
  expect(screen.getByLabelText("Max altitude: 2100 m")).toBeOnTheScreen();
  expect(screen.getByLabelText("Total: 5.77 km")).toBeOnTheScreen();
});

test("the end of a tour lists its phases and the changeover between them", async () => {
  await render(
    <SkiTourFinishCard
      run={tourRun(oneClimb())}
      activity="ski_touring"
      onDone={jest.fn()}
    />,
  );
  expect(screen.getByText("Phases")).toBeOnTheScreen();
  expect(screen.getByText("Climb 1")).toBeOnTheScreen();
  expect(screen.getByText("Skins off")).toBeOnTheScreen();
  expect(screen.getByText("Descent 1")).toBeOnTheScreen();
  expect(screen.getByText("+600 m")).toBeOnTheScreen();
  expect(screen.getByText("−600 m")).toBeOnTheScreen();
  expect(screen.getByText("600 m/h")).toBeOnTheScreen();
});

test("without heights the end of a tour says why it has no phases", async () => {
  await render(
    <SkiTourFinishCard
      run={tourRun(oneClimb(false))}
      activity="ski_touring"
      onDone={jest.fn()}
    />,
  );
  expect(
    screen.getByText("No heights from the phone: no phases for this tour."),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Climbed: – m")).toBeOnTheScreen();
  expect(screen.queryByText("Phases")).toBeNull();
});

test("a tour ends on its own card, from the sport of «Settings»", async () => {
  await render(<FreeFinishCard run={tourRun(oneClimb())} onDone={jest.fn()} />);
  expect(screen.getByLabelText("Climbed: 600 m")).toBeOnTheScreen();
});

test("on the way, the phase, the VAM, the metres climbed and the height", async () => {
  const climbing = tourOf([[1800, 10, 1440, 300]]);
  await render(<SkiTourLive track={climbing} live={false} />);
  expect(screen.getByLabelText("Phase: Climb")).toBeOnTheScreen();
  expect(screen.getByLabelText("VAM 5 min: 600 m/h")).toBeOnTheScreen();
  expect(screen.getByLabelText("Elev. gain: 300 m")).toBeOnTheScreen();
  expect(screen.getByLabelText("Altitude: 1800 m")).toBeOnTheScreen();
});

test("the run's card of a tour has the tour's numbers over it", async () => {
  await render(<FreeRunCard running={false} track={oneClimb()} onStop={jest.fn()} />);
  expect(screen.getByTestId("ski-tour-live")).toBeOnTheScreen();
  mockSport = "run";
});

test("«Changeover» marks one by hand, «Resume» ends it, and the end of the tour lists it (B3)", async () => {
  // At the top of a climb of half an hour, twenty seconds after the last fix.
  const climbing = tourOf([[1800, 10, 1440, 300]]);
  const now = jest.spyOn(Date, "now").mockReturnValue(1_820_000);
  await render(<SkiTourLive track={climbing} live />);
  expect(screen.getByLabelText("Phase: Climb")).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("🎿 Changeover"));
  expect(loadSkinChanges(0)).toEqual([{ fromMs: 1_820_000, toMs: null }]);
  expect(screen.getByLabelText(/^Phase: Changeover /)).toBeOnTheScreen();
  now.mockReturnValue(2_000_000);
  await fireEvent.press(screen.getByText("Resume"));
  expect(loadSkinChanges(0)).toEqual([{ fromMs: 1_820_000, toMs: 2_000_000 }]);
  expect(screen.getByText("🎿 Changeover")).toBeOnTheScreen();
  // Then down: the end of the tour has the skins off when they were marked.
  const tour = tourOf([
    [1800, 10, 1440, 300],
    [200, 0, 0, 0],
    [300, 5, -1440, -300],
  ]);
  await render(
    <SkiTourFinishCard run={tourRun(tour)} activity="ski_touring" onDone={jest.fn()} />,
  );
  expect(screen.getByText("Skins off")).toBeOnTheScreen();
  expect(
    screen.getByLabelText(/^Skins off, from \d\d:30, for 3 min$/),
  ).toBeOnTheScreen();
});

test("a changeover marked by hand ends by itself once the tour moves on", async () => {
  // Marked at the top, then 30 m down the other side.
  const stood = tourOf([
    [1800, 10, 1440, 300],
    [200, 0, 0, 0],
  ]);
  jest.spyOn(Date, "now").mockReturnValue(1_810_000);
  const { rerender } = await render(<SkiTourLive track={stood} live />);
  await fireEvent.press(screen.getByText("🎿 Changeover"));
  expect(screen.getByText("Resume")).toBeOnTheScreen();
  const moved = tourOf([
    [1800, 10, 1440, 300],
    [200, 0, 0, 0],
    [60, 5, -400, -80],
  ]);
  await rerender(<SkiTourLive track={moved} live />);
  const [change] = loadSkinChanges(0);
  expect(change.toMs).not.toBeNull();
  expect(screen.getByText("🎿 Changeover")).toBeOnTheScreen();
});

test("a tour that is over has no «Changeover» to tap", async () => {
  await render(<SkiTourLive track={oneClimb()} live={false} />);
  expect(screen.queryByTestId("skin-change")).toBeNull();
});
