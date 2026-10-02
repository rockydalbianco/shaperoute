import scoreRequest from "@shaperoute/shared-types/fixtures/track-score-request.json";
import scored from "@shaperoute/shared-types/fixtures/track-score.json";
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { ScorableRun } from "../navigation/trackStore";
import { durationLabel, FinishBanner, FinishCard } from "./FinishScreen";

const URL = "http://192.168.1.23:8000";

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

function answering(status: number, body: unknown) {
  return jest.fn(async () => Response.json(body, { status }));
}

const unreachable = () =>
  jest.fn(async () => {
    throw new Error("Network request failed");
  });

test("the score of the run, with how far, how long and how much of the route", async () => {
  const onDone = jest.fn();
  const fetchFn = answering(200, scored);
  await render(<FinishCard apiUrl={URL} run={RUN} onDone={onDone} fetchFn={fetchFn} />);
  expect(await screen.findByText("91")).toBeTruthy();
  expect(screen.getByLabelText("Score: 91 out of 100")).toBeTruthy();
  expect(screen.getByText("4.0 km · 20 min · 100% of the route")).toBeTruthy();
  expect(screen.queryByText("Try again")).toBeNull();
  expect(screen.queryByText("Keep running")).toBeNull();

  await fireEvent.press(screen.getByText("Done"));
  // Judged: the run may be forgotten.
  expect(onDone).toHaveBeenCalledWith(true);
});

test("while the score is on its way, the run is already there", async () => {
  const never = jest.fn(() => new Promise<Response>(() => {}));
  await render(
    <FinishCard apiUrl={URL} run={RUN} onDone={jest.fn()} fetchFn={never} />,
  );
  expect(screen.getByText("Scoring your run…")).toBeTruthy();
  expect(screen.getByText("4.0 km · 20 min")).toBeTruthy();
});

test("without the API the run is kept and the score can be asked again", async () => {
  const onDone = jest.fn();
  let fetchFn: jest.Mock = unreachable();
  const proxy: typeof fetch = (...args) => fetchFn(...args);
  await render(<FinishCard apiUrl={URL} run={RUN} onDone={onDone} fetchFn={proxy} />);
  expect(await screen.findByText("The score will come later")).toBeTruthy();
  expect(screen.getByText(/Your run is saved on this phone/)).toBeTruthy();

  await fireEvent.press(screen.getByText("Done"));
  // Not judged yet: the run must not be forgotten.
  expect(onDone).toHaveBeenCalledWith(false);

  fetchFn = answering(200, scored);
  await fireEvent.press(screen.getByText("Try again"));
  expect(await screen.findByText("91")).toBeTruthy();
});

test("an app that does not know its API says the score will come later", async () => {
  await render(<FinishCard apiUrl={null} run={RUN} onDone={jest.fn()} />);
  expect(screen.getByText("The score will come later")).toBeTruthy();
});

test("a run the engine refuses is too short, and settled", async () => {
  const onDone = jest.fn();
  const refused = answering(422, {
    error: {
      code: "invalid_request",
      message: "This run cannot be scored: the track is 80 m long.",
      suggested_distance_m: null,
      reason: null,
    },
  });
  await render(<FinishCard apiUrl={URL} run={RUN} onDone={onDone} fetchFn={refused} />);
  expect(await screen.findByText("Too short for a score")).toBeTruthy();
  expect(screen.queryByText("Try again")).toBeNull();
  await fireEvent.press(screen.getByText("Done"));
  expect(onDone).toHaveBeenCalledWith(true);
});

test("an answer that makes no sense can be asked again", async () => {
  const broken = answering(500, "oops");
  await render(
    <FinishCard apiUrl={URL} run={RUN} onDone={jest.fn()} fetchFn={broken} />,
  );
  expect(await screen.findByText("The score did not arrive")).toBeTruthy();
  expect(screen.getByText("Try again")).toBeTruthy();
});

test("a stopped run can go on", async () => {
  const onResume = jest.fn();
  await render(
    <FinishCard
      apiUrl={URL}
      run={{ ...RUN, status: "stopped" }}
      onDone={jest.fn()}
      onResume={onResume}
      fetchFn={answering(200, scored)}
    />,
  );
  await fireEvent.press(await screen.findByText("Keep running"));
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
  const fetchFn = answering(200, scored);
  await render(<FinishCard apiUrl={URL} run={RUN} fetchFn={fetchFn} />);
  await screen.findByText("91");
  expect(screen.queryByText("Done")).toBeNull();
});
