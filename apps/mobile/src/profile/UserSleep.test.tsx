import noStages from "@shaperoute/shared-types/fixtures/sleep-summary-no-stages.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";
import { act, render, screen } from "@testing-library/react-native";

import { answers as answering, apiError } from "../account/testing";
import { sleepPostsOn } from "../health/sleepModules";
import { ProfileSleep } from "./ProfileSleep";
import { UserSleep } from "./UserSleep";

// The sleep on another member's profile (TASK-467 part B3): the latest
// night they shared, read from the API. Behind `sleepPostsOn`, which is off
// in every build until part C: turned on here to test what it hides.

jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => true),
}));

const on = jest.mocked(sleepPostsOn);
const API = "http://api";
const NOTE =
  "Worked out by MuW from Apple Health data. It can differ from the score in the Health app.";
const answers = (...list: Parameters<typeof answering>) =>
  answering(...list) as unknown as typeof fetch & jest.Mock;

beforeEach(() => {
  on.mockReturnValue(true);
});

async function show(fetchFn: typeof fetch, publicId = "p1") {
  const sessionEnded = jest.fn();
  await render(
    <UserSleep
      apiUrl={API}
      token="t"
      publicId={publicId}
      onSessionEnded={sessionEnded}
      fetchFn={fetchFn}
      apiKey={null}
    />,
  );
  await act(async () => {});
  return sessionEnded;
}

test("a night on a profile: score, word, hours, stages, its day, and whose score it is", async () => {
  await render(<ProfileSleep night={summary} />);
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
  // Of when the night is: it may be days old.
  expect(screen.getByText("21 Sep")).toBeTruthy();
  expect(screen.getByText(NOTE)).toBeTruthy();
  // No hour of going to bed or of waking.
  expect(screen.queryByText(/\d{1,2}:\d{2}/)).toBeNull();
});

test("a night no watch told the stages of has none", async () => {
  await render(<ProfileSleep night={noStages} />);
  expect(screen.getByText("64 · Good")).toBeTruthy();
  expect(screen.getByText("6 h 35 min")).toBeTruthy();
  expect(screen.queryByText("Awake")).toBeNull();
  expect(screen.queryByText("Deep")).toBeNull();
});

test("the latest night the member shares is asked to the API and shown", async () => {
  const fetchFn = answers({ status: 200, body: summary });
  await show(fetchFn, "p 1");
  expect(screen.getByTestId("profile-sleep")).toBeTruthy();
  expect(screen.getByText("82 · Very good")).toBeTruthy();
  expect(fetchFn).toHaveBeenCalledTimes(1);
  const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
  expect(url).toBe(`${API}/users/p%201/sleep`);
  expect(init.method).toBe("GET");
  // Read only: nothing here shares or stops sharing.
  expect(screen.queryAllByRole("button")).toHaveLength(0);
});

test("a night not shared is to anyone else as one that is not there", async () => {
  // The API answers the same 404 for no night, one not shared, and a block.
  await show(answers({ status: 404, body: apiError("http_error") }));
  expect(screen.toJSON()).toBeNull();
});

test("an answer that is not a night, or no answer, shows nothing", async () => {
  await show(answers({ status: 200, body: { ...summary, score: 140 } }));
  expect(screen.toJSON()).toBeNull();
  await show(answers(new Error("offline")));
  expect(screen.toJSON()).toBeNull();
});

test("a session that ended is told", async () => {
  const ended = await show(answers({ status: 401, body: apiError("session_expired") }));
  expect(ended).toHaveBeenCalledWith("t");
  expect(screen.toJSON()).toBeNull();
});

test("while the sleep is off nothing shows and nothing is asked", async () => {
  on.mockReturnValue(false);
  const fetchFn = answers({ status: 200, body: summary });
  await show(fetchFn);
  expect(screen.toJSON()).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});
