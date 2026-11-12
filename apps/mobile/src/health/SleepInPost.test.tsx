import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import activity from "@shaperoute/shared-types/fixtures/sleep-activity.json";
import noStages from "@shaperoute/shared-types/fixtures/sleep-summary-no-stages.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { answers as answering, apiError } from "../account/testing";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { SleepCard } from "./SleepCard";
import { SleepLine } from "./SleepLine";
import { sleepPostsOn } from "./sleepModules";
import { forgetSleepNow, tellSleepNow } from "./sleepNow";
import { SleepPostSwitch } from "./SleepPostSwitch";

// The night of a post where others read it (TASK-467 part B2): a line in
// the card of «Feed», a card on the page of the post, and the owner's
// switch in the post's settings. All of it behind `sleepPostsOn`, which is
// off in every build until part C: turned on here to test what it hides.

jest.mock("./sleepModules", () => ({
  ...jest.requireActual("./sleepModules"),
  sleepPostsOn: jest.fn(() => true),
}));

const on = jest.mocked(sleepPostsOn);
const NOTE =
  "Worked out by MuW from Apple Health data. It can differ from the score in the Health app.";
const SHOWN = "Shown in this post. Turn it off to keep it to yourself.";
const answers = (...list: Parameters<typeof answering>) =>
  answering(...list) as unknown as typeof fetch & jest.Mock;

beforeEach(() => {
  on.mockReturnValue(true);
  forgetSleepNow();
});

function follows(): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: { status: "signedIn", session: session as Session },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

async function inDoor(children: React.ReactNode) {
  await render(
    <FollowsContext.Provider value={follows()}>{children}</FollowsContext.Provider>,
  );
  await act(async () => {});
}

test("the card of «Feed» says the night in a line: MuW's score, never Apple's", async () => {
  await render(<SleepLine drawingId="d" sleep={summary} />);
  expect(screen.getByTestId("sleep-line").props.children).toBe(
    "Sleep score 82 · Very good · 7 h 32 min",
  );
  expect(screen.queryByText(/Apple/)).toBeNull();
});

test("the page of the post: score, word, hours, stages, and whose score it is", async () => {
  await render(<SleepCard drawingId="d" sleep={summary} />);
  expect(screen.getByRole("header", { name: "Sleep score" })).toBeTruthy();
  expect(screen.getByText("82 · Very good")).toBeTruthy();
  expect(screen.getByText("7 h 32 min")).toBeTruthy();
  for (const stage of [
    "Awake: 18 min",
    "REM: 1 h 36 min",
    "Light: 4 h 28 min",
    "Deep: 1 h 12 min",
  ]) {
    expect(screen.getByLabelText(stage)).toBeTruthy();
  }
  expect(screen.getByText(NOTE)).toBeTruthy();
  // The night is a day: no hour of going to bed or of waking is written.
  expect(screen.queryByText(/\d{1,2}:\d{2}/)).toBeNull();
  expect(screen.queryByText(/2026-09-21/)).toBeNull();
});

test("a night no watch told the stages of shows none", async () => {
  await render(<SleepCard drawingId="d" sleep={noStages} />);
  expect(screen.getByText("64 · Good")).toBeTruthy();
  expect(screen.queryByLabelText(/^Awake/)).toBeNull();
  expect(screen.getByText(NOTE)).toBeTruthy();
});

test.each([null, undefined, { ...summary, score: 140 }, "82"])(
  "a post without a night, or with what is not one, shows nothing: %j",
  async (sleep) => {
    await render(
      <>
        <SleepLine drawingId="d" sleep={sleep} />
        <SleepCard drawingId="d" sleep={sleep} />
      </>,
    );
    expect(screen.queryByTestId("sleep-line")).toBeNull();
    expect(screen.queryByTestId("post-sleep")).toBeNull();
  },
);

test("while the sleep in a post is off, a night the API gives is not shown", async () => {
  on.mockReturnValue(false);
  await inDoor(
    <>
      <SleepLine drawingId="d" sleep={summary} />
      <SleepCard drawingId="d" sleep={summary} />
      <SleepPostSwitch drawingId="d" runKey="k" fetchFn={answers()} />
    </>,
  );
  expect(screen.queryByTestId("sleep-line")).toBeNull();
  expect(screen.queryByTestId("post-sleep")).toBeNull();
  expect(screen.queryByTestId("post-sleep-switch")).toBeNull();
});

test("what the owner just chose shows at once, in the post it is of", async () => {
  await render(
    <>
      <SleepLine drawingId="d" sleep={summary} />
      <SleepLine drawingId="other" sleep={summary} />
    </>,
  );
  expect(screen.getAllByTestId("sleep-line")).toHaveLength(2);
  await act(async () => tellSleepNow("d", null));
  expect(screen.getAllByTestId("sleep-line")).toHaveLength(1);
  await act(async () => tellSleepNow("d", noStages));
  expect(screen.getAllByTestId("sleep-line")).toHaveLength(2);
});

test("the owner's switch reads the night of the run and turns it off", async () => {
  const fetchFn = answers(
    { status: 200, body: activity },
    { status: 200, body: { ...activity, shown: false } },
    { status: 200, body: activity },
  );
  await inDoor(
    <>
      <SleepPostSwitch drawingId="d" runKey="k" fetchFn={fetchFn} />
      <SleepCard drawingId="d" sleep={summary} />
    </>,
  );
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/me/activities/k/sleep");
  const toggle = () => screen.getByRole("switch", { name: "Sleep last night" });
  expect(toggle().props.accessibilityState.checked).toBe(true);
  expect(screen.getByText("82 · Very good · 7 h 32 min")).toBeTruthy();
  expect(screen.getByText(SHOWN)).toBeTruthy();
  expect(screen.getByTestId("post-sleep")).toBeTruthy();

  await fireEvent.press(toggle());
  await act(async () => {});
  const [url, init] = fetchFn.mock.calls[1] as [string, RequestInit];
  expect([url, init.method, init.body]).toEqual([
    "http://api/me/activities/k/sleep",
    "PATCH",
    '{"shown":false}',
  ]);
  expect(toggle().props.accessibilityState.checked).toBe(false);
  expect(screen.queryByText(SHOWN)).toBeNull();
  // The page under the sheet follows at once.
  expect(screen.queryByTestId("post-sleep")).toBeNull();

  await fireEvent.press(toggle());
  await act(async () => {});
  expect(toggle().props.accessibilityState.checked).toBe(true);
  expect(screen.getByTestId("post-sleep")).toBeTruthy();
});

test("a post without a night has no switch", async () => {
  const fetchFn = answers({ status: 404, body: apiError("not_found") });
  await inDoor(<SleepPostSwitch drawingId="d" runKey="k" fetchFn={fetchFn} />);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("post-sleep-switch")).toBeNull();
});

test("a switch the API did not take stays as it was, and says so", async () => {
  const fetchFn = answers({ status: 200, body: activity }, new Error("offline"));
  await inDoor(
    <>
      <SleepPostSwitch drawingId="d" runKey="k" fetchFn={fetchFn} />
      <SleepLine drawingId="d" sleep={summary} />
    </>,
  );
  await fireEvent.press(screen.getByRole("switch", { name: "Sleep last night" }));
  await act(async () => {});
  expect(
    screen.getByRole("switch", { name: "Sleep last night" }).props.accessibilityState
      .checked,
  ).toBe(true);
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.getByTestId("sleep-line")).toBeTruthy();
});
