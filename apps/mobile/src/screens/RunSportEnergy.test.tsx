/**
 * The calories of the sport recorded (TASK-424 part C2, the user's choice
 * of 2026-11-10: calories for every activity): a day of skiing has a
 * ride's speeds but counts its descents alone, a swim in open water has a
 * pool's, and Apple Health is written the number the screen shows.
 */
import type { Activity, LatLon, RunActivity } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { workoutOf } from "../health/workout";
import { addFix, emptyTrack, type Track } from "../navigation/trackRecorder";
import { RunGrid, useRunNumbers } from "./RunPanel";

const START: LatLon = [46.4, 11.8];
const METRE = 1 / 111_195;

/** Fixes `every` seconds for `seconds`, `northM` metres north and `upM`
 * metres up, from where `track` ends. */
function going(
  from: { track: Track; north: number; height: number; at: number },
  seconds: number,
  every: number,
  northM: number,
  upM: number,
) {
  let { track } = from;
  for (let s = every; s <= seconds; s += every) {
    track = addFix(track, {
      point: [START[0] + (from.north + (northM * s) / seconds) * METRE, START[1]],
      timeMs: (from.at + s) * 1000,
      accuracyM: 5,
      altitudeM: from.height + (upM * s) / seconds,
    });
  }
  return {
    track,
    north: from.north + northM,
    height: from.height + upM,
    at: from.at + seconds,
  };
}

function start() {
  return {
    track: addFix(emptyTrack(), {
      point: START,
      timeMs: 0,
      accuracyM: 5,
      altitudeM: 2000,
    }),
    north: 0,
    height: 2000,
    at: 0,
  };
}

/** Two descents of 1.2 km and 300 m down at 10 m/s, a chairlift between
 * them: 300 m up in five minutes. */
function twoDescents(): Track {
  let day = going(start(), 120, 5, 1200, -300);
  day = going(day, 300, 10, -1200, 300);
  return going(day, 120, 5, 1200, -300).track;
}

/** The two descents alone, one after the other. */
function descentsOnly(): Track {
  let day = going(start(), 120, 5, 1200, -300);
  day = going({ ...day, height: 2000 }, 1, 1, 0, 0);
  return going({ ...day, height: 2000 }, 120, 5, 1200, -300).track;
}

function Energy({
  track,
  activity,
  sport,
}: {
  track: Track;
  activity?: Activity;
  sport?: RunActivity;
}) {
  const numbers = useRunNumbers(track, false, undefined, activity, sport);
  return <Text testID="energy">{numbers.energy ?? "none"}</Text>;
}

test("a day of skiing counts its descents, not its lift nor a ride's formula", async () => {
  // 4 minutes on the descents at 5.3 MET, 70 kg, less the rest.
  await render(<Energy track={twoDescents()} activity="cycling" sport="skiing" />);
  expect(screen.getByTestId("energy")).toHaveTextContent("21");
  // Before: a ride's formula on the whole day, the lift with it.
  await render(<Energy track={twoDescents()} activity="cycling" />);
  expect(screen.getByTestId("energy")).not.toHaveTextContent(/^21$/);
});

test("the lift adds nothing to the calories of the day", () => {
  expect(workoutOf(twoDescents(), "skiing")?.kcal).toBe(21);
  expect(workoutOf(descentsOnly(), "skiing")?.kcal).toBe(21);
});

test("cross-country skiing and ski touring have theirs in Apple Health", () => {
  // 3.6 km in 9 minutes: 24 km/h, racing, 15 MET.
  expect(workoutOf(twoDescents(), "xc_skiing")?.kcal).toBe(154);
  expect(workoutOf(twoDescents(), "ski_touring")?.kcal).toBeGreaterThan(0);
  expect(workoutOf(twoDescents(), "swimming")?.kcal).toBeGreaterThan(0);
});

test("a swim in open water shows its calories among the swim's numbers", async () => {
  const Grid = () => (
    <RunGrid numbers={useRunNumbers(twoDescents(), false, undefined, "swimming")} />
  );
  await render(<Grid />);
  expect(screen.getByText("Avg /100 m")).toBeOnTheScreen();
  expect(screen.getByText("Calories")).toBeOnTheScreen();
});
