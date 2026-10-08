import scoreRequest from "@shaperoute/shared-types/fixtures/track-score-request.json";
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { ScorableRun } from "../navigation/trackStore";
import { durationLabel, FinishBanner, FinishCard } from "./FinishScreen";

const RUN: ScorableRun = {
  version: 1,
  route: scoreRequest.points as LatLon[],
  similarity: scoreRequest.similarity,
  status: "arrived",
  track: {
    distanceM: 4007,
    fixes: scoreRequest.track.map((fix) => ({
      point: fix.point as LatLon,
      timeMs: fix.time_ms,
      accuracyM: fix.accuracy_m,
    })),
  },
};

test("how far and how long, and never a score", async () => {
  const onDone = jest.fn();
  await render(<FinishCard run={RUN} onDone={onDone} />);
  expect(screen.getByText("4.0 km · 20 min")).toBeTruthy();
  expect(screen.queryByText(/out of 100/)).toBeNull();
  expect(screen.queryByLabelText(/^Score/)).toBeNull();
  expect(screen.queryByText(/score/i)).toBeNull();
  expect(screen.queryByText("Try again")).toBeNull();
  expect(screen.queryByText("Keep running")).toBeNull();

  await fireEvent.press(screen.getByText("Done"));
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("asks the API for nothing", async () => {
  const asked = jest.spyOn(globalThis, "fetch");
  await render(<FinishCard run={RUN} onDone={jest.fn()} />);
  expect(asked).not.toHaveBeenCalled();
  asked.mockRestore();
});

test("a stopped run can go on", async () => {
  const onResume = jest.fn();
  await render(
    <FinishCard
      run={{ ...RUN, status: "stopped" }}
      onDone={jest.fn()}
      onResume={onResume}
    />,
  );
  await fireEvent.press(screen.getByText("Keep running"));
  expect(onResume).toHaveBeenCalled();
});

test("the banner says which line is which", async () => {
  await render(<FinishBanner />);
  expect(screen.getByText("Your run")).toBeTruthy();
  expect(screen.getByText("Yellow: the route. White: what you ran.")).toBeTruthy();
});

test("durations read in minutes, then hours and minutes", () => {
  expect(durationLabel(0)).toBe("0 min");
  expect(durationLabel(32 * 60_000 + 20_000)).toBe("32 min");
  expect(durationLabel(65 * 60_000)).toBe("1 h 05 min");
});

test("without a way out of its own the card has no Done: Save and Discard are under it", async () => {
  await render(<FinishCard run={RUN} />);
  expect(screen.getByText("4.0 km · 20 min")).toBeTruthy();
  expect(screen.queryByText("Done")).toBeNull();
});
