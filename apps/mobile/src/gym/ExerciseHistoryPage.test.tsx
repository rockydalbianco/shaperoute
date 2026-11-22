import type { GymHistory } from "@shaperoute/shared-types";
import example from "@shaperoute/shared-types/fixtures/gym-history.json";
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { ExerciseHistory } from "./ExerciseHistoryPage";
import type { ExerciseHistoryState } from "./useExerciseHistory";

// TASK-483 B (ADR-0392): «History» of one exercise, the chart, the records
// and every workout with an arrow against the one before.

const history = example as GymHistory;
const NOW = Date.UTC(2026, 10, 20, 12);

function state(more: Partial<ExerciseHistoryState> = {}): ExerciseHistoryState {
  return {
    history,
    off: false,
    failed: false,
    loadMore: null,
    loadingMore: false,
    ...more,
  };
}

test("the chart, the records and the workouts", async () => {
  const onBack = jest.fn();
  const loadMore = jest.fn();
  await render(
    <ExerciseHistory
      title="Bench press"
      state={state({ loadMore })}
      units="km"
      nowMs={NOW}
      onBack={onBack}
    />,
  );
  expect(screen.getByText("Bench press")).toBeOnTheScreen();
  expect(screen.getAllByText("Estimated max").length).toBeGreaterThan(0);
  expect(screen.getByTestId("history-range-3M")).toBeSelected();
  expect(
    screen.getByText("Estimated from your sets of up to 12 reps."),
  ).toBeOnTheScreen();
  expect(screen.getByTestId("record-best_estimate_kg")).toHaveTextContent(
    /96\.3 kg.*82\.5 kg × 5/,
  );
  expect(screen.getByTestId("record-most_reps")).toHaveTextContent(/15.*60 kg × 15/);
  expect(screen.getByTestId("record-best_volume_kg")).toHaveTextContent(/1740 kg/);
  expect(screen.getByText("3 workouts")).toBeOnTheScreen();
  const second = within(screen.getByTestId("history-hb00000000000002"));
  expect(second.getByTestId("history-pr")).toBeOnTheScreen();
  expect(second.getByTestId("history-change")).toHaveTextContent("↑ +2.9 kg");
  expect(second.getByText("82.5 kg × 5 · 75 kg × 8")).toBeOnTheScreen();
  // Only long sets: no max to compare, no arrow.
  const third = within(screen.getByTestId("history-hb00000000000003"));
  expect(third.queryByTestId("history-change")).toBeNull();
  expect(third.queryByTestId("history-pr")).toBeNull();
  await fireEvent.press(screen.getByTestId("history-more"));
  expect(loadMore).toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId("history-back"));
  expect(onBack).toHaveBeenCalled();
});

test("a range with no workout in it says so", async () => {
  await render(
    <ExerciseHistory
      title="Bench press"
      state={state()}
      units="km"
      nowMs={Date.UTC(2027, 5, 1)}
      onBack={jest.fn()}
    />,
  );
  expect(screen.getByTestId("history-chart-empty")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("history-range-all"));
  expect(screen.getByTestId("history-chart")).toBeOnTheScreen();
  expect(screen.queryByTestId("history-more")).toBeNull();
});

test("waiting, no network, never done", async () => {
  const props = {
    title: "Ring dips",
    units: "km" as const,
    nowMs: NOW,
    onBack: jest.fn(),
  };
  await render(<ExerciseHistory {...props} state={state({ history: null })} />);
  expect(screen.getByTestId("history-waiting")).toHaveTextContent("Loading…");
  await render(
    <ExerciseHistory {...props} state={state({ history: null, failed: true })} />,
  );
  expect(screen.getByTestId("history-waiting")).toHaveTextContent(/No connection/);
  await render(
    <ExerciseHistory
      {...props}
      state={state({
        history: { workouts_count: 0, points: [], records: [], workouts: [] },
      })}
    />,
  );
  expect(screen.getByTestId("history-none")).toBeOnTheScreen();
});
