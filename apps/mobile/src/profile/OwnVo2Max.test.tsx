import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session, Vo2Max, Vo2MaxSettings } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import { FollowsContext } from "../social/followsDoor";
import { loadVo2MaxAsked, OwnVo2Max } from "./OwnVo2Max";

// The VO₂ max on one's own profile (TASK-397): the question once, then the
// row only its owner sees until «Show it».

const mockFiles = new Map<string, string>();

jest.mock("expo-file-system", () => {
  class MockFile {
    private readonly path: string;
    constructor(_directory: string, name: string) {
      this.path = name;
    }
    get exists() {
      return mockFiles.has(this.path);
    }
    create() {
      mockFiles.set(this.path, "");
    }
    write(text: string) {
      mockFiles.set(this.path, text);
    }
    textSync() {
      return mockFiles.get(this.path) ?? "";
    }
  }
  return { File: MockFile, Paths: { document: "doc" } };
});

beforeEach(() => mockFiles.clear());

const URL = "http://api";
const TOKEN = (session as Session).token;
const estimate: Vo2Max = {
  value: 50,
  source: "estimate",
  measured_on: "2026-10-18",
  from_distance: "5k",
};

async function show(fetchFn: jest.Mock) {
  const sessionEnded = jest.fn();
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: {
          state: { status: "signedIn", session: session as Session },
          sessionEnded,
        },
        openProfile: jest.fn(),
      }}
    >
      <OwnVo2Max fetchFn={fetchFn} apiKey={null} />
    </FollowsContext.Provider>,
  );
  return sessionEnded;
}

function settings(show: boolean, vo2max: Vo2Max | null = estimate): Vo2MaxSettings {
  return { show, vo2max };
}

function calls(fetchFn: jest.Mock) {
  return fetchFn.mock.calls.map(([url, init]) => [url, init.method]);
}

test("nothing to show: no row and no question", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: settings(false, null) });
  await show(fetchFn);
  expect(calls(fetchFn)).toEqual([[`${URL}/me/vo2max`, "GET"]]);
  expect(fetchFn.mock.calls[0][1]).toMatchObject({
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  expect(screen.queryByTestId("vo2max")).toBeNull();
});

test("after the yes, the row as the others see it, with «your»", async () => {
  await show(answers({ status: 200, body: settings(true) }));
  expect(await screen.findByText("Estimate from your 5K")).toBeOnTheScreen();
  expect(screen.queryByText("Only you see this")).toBeNull();
  expect(screen.queryByTestId("vo2max-question")).toBeNull();
});

test("the first time, the question with its approved words; «Not now» keeps it", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: settings(false) });
  await show(fetchFn);
  expect(
    await screen.findByRole("header", { name: "Show your VO₂ max?" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByText(
      "Everyone who can see your profile will see it. You can turn it off in Settings.",
    ),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Not now" }));
  expect(screen.queryByTestId("vo2max-question")).toBeNull();
  expect(screen.getByText("Only you see this")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Show it" })).toBeOnTheScreen();
  expect(loadVo2MaxAsked()).toBe(true);
  // Nothing goes to the API without the yes.
  expect(calls(fetchFn)).toEqual([[`${URL}/me/vo2max`, "GET"]]);
});

test("asked once: then only «Only you see this» and «Show it»", async () => {
  mockFiles.set("vo2max-asked.json", JSON.stringify({ asked: true }));
  await show(answers({ status: 200, body: settings(false) }));
  expect(await screen.findByText("Only you see this")).toBeOnTheScreen();
  expect(screen.queryByTestId("vo2max-question")).toBeNull();
});

test("«Show it» gives the yes to the API, and the row is the others' then", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: settings(false) },
    { status: 200, body: settings(true) },
  );
  await show(fetchFn);
  await fireEvent.press(await screen.findByRole("button", { name: "Show it" }));
  expect(calls(fetchFn)).toEqual([
    [`${URL}/me/vo2max`, "GET"],
    [`${URL}/me/vo2max`, "PUT"],
  ]);
  expect(JSON.parse(fetchFn.mock.calls[1][1].body)).toEqual({ show: true });
  expect(await screen.findByText("Estimate from your 5K")).toBeOnTheScreen();
  expect(screen.queryByTestId("vo2max-question")).toBeNull();
  expect(screen.queryByText("Only you see this")).toBeNull();
  expect(loadVo2MaxAsked()).toBe(true);
});

test("a yes that does not arrive says why and keeps the question", async () => {
  await show(answers({ status: 200, body: settings(false) }, new TypeError("offline")));
  await fireEvent.press(await screen.findByRole("button", { name: "Show it" }));
  expect(await screen.findByText(/^No connection\./)).toBeOnTheScreen();
  expect(screen.getByTestId("vo2max-question")).toBeOnTheScreen();
});

test("an API older than TASK-397 shows nothing", async () => {
  const fetchFn: jest.Mock = answers({ status: 404, body: { detail: "Not Found" } });
  await show(fetchFn);
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
  expect(screen.queryByTestId("vo2max")).toBeNull();
});

test("an ended session is said to the account", async () => {
  const sessionEnded = await show(
    answers({ status: 401, body: apiError("session_expired") }),
  );
  await waitFor(() => expect(sessionEnded).toHaveBeenCalledWith(TOKEN));
  expect(screen.queryByTestId("vo2max")).toBeNull();
});
