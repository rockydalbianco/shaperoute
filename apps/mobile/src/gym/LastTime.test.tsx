import type { GymHistory } from "@shaperoute/shared-types";
import example from "@shaperoute/shared-types/fixtures/gym-history.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { LastTime, suggestedLabel } from "./LastTime";

// TASK-483 B (ADR-0392): «Last time» under the exercise under way, with
// the user's rule for «Try …».

const history = example as GymHistory;

test("last time's day, its sets, the suggestion and «History»", async () => {
  const onHistory = jest.fn();
  await render(
    <LastTime history={history} target={null} units="km" onHistory={onHistory} />,
  );
  expect(screen.getByText(/^Last time · \w+ 1[01] Nov 2026$/)).toBeOnTheScreen();
  expect(screen.getByTestId("last-time-sets")).toHaveTextContent(
    "60 kg × 15 · 60 kg × 14",
  );
  // 14 of 15 reps: the same again.
  expect(screen.getByTestId("last-time-try")).toHaveTextContent("Try 60 kg × 15 again");
  await fireEvent.press(screen.getByTestId("open-history"));
  expect(onHistory).toHaveBeenCalled();
});

test("the plan's reps, reached: a little more", async () => {
  await render(
    <LastTime
      history={history}
      target={{ reps: 12 }}
      units="km"
      onHistory={jest.fn()}
    />,
  );
  expect(screen.getByTestId("last-time-try")).toHaveTextContent("Try 62.5 kg × 12");
});

test("nothing for an exercise never done, no suggestion for cardio", async () => {
  await render(
    <LastTime
      history={{ workouts_count: 0, points: [], records: [], workouts: [] }}
      target={null}
      units="km"
      onHistory={jest.fn()}
    />,
  );
  expect(screen.queryByTestId("last-time")).toBeNull();
  await render(
    <LastTime
      history={{
        exercise: "treadmill",
        kind: "cardio",
        measure: "distance_m",
        workouts_count: 1,
        points: [],
        records: [],
        workouts: [
          {
            id: "w",
            started_at: "2026-11-10T17:00:00Z",
            source: "muw",
            sets: [
              {
                exercise: "treadmill",
                kind: "cardio",
                duration_s: 900,
                distance_m: 2400,
                at_s: 0,
                live: true,
              },
            ],
          },
        ],
      }}
      target={null}
      units="km"
      onHistory={jest.fn()}
    />,
  );
  expect(screen.getByTestId("last-time-sets")).toHaveTextContent("15:00 · 2.4 km");
  expect(screen.queryByTestId("last-time-try")).toBeNull();
});

test("what a suggestion asks, by the kind", () => {
  expect(suggestedLabel("bodyweight", { reps: 13 }, "km")).toBe("13 reps");
  expect(suggestedLabel("bodyweight", { reps: 12, load_kg: 10 }, "km")).toBe(
    "+10 kg × 12",
  );
  expect(suggestedLabel("timed", { duration_s: 65 }, "km")).toBe("1:05");
});
