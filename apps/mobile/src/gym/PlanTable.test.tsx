/**
 * «Table» in «My plans» (TASK-506 A, the user's «Da guardare + Settimane»
 * of 2026-11-23): the whole plan on one page; a week's head opens the
 * guide's «Weeks»; «‹» goes back to the plans.
 */
import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { GymPlan, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { GymPlansSheet } from "./GymPlans";
import { forgetPlans, mergePlans } from "./plans";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const OWNER = 7;
const [PUSH, , MUSCLE, LIFT_AND_RUN] = plans.plans as GymPlan[];

function api(remote: GymPlan[]) {
  return jest.fn(async () => Response.json({ plans: remote }));
}

async function shownPlans(remote: GymPlan[]) {
  mergePlans(OWNER, remote);
  await render(
    <FollowsContext.Provider
      value={
        {
          apiUrl: "http://api",
          account: {
            state: { status: "signedIn", session: session as Session },
            sessionEnded: () => {},
          },
          openProfile: () => {},
        } as unknown as FollowsDoor
      }
    >
      <ActivitiesContext.Provider
        value={{ owner: OWNER, total: 3, list: [] } as unknown as ActivitiesDoor}
      >
        <GymPlansSheet
          visible
          onClose={jest.fn()}
          fetchFn={api(remote) as unknown as typeof fetch}
        />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  files.clear();
  forgetPlans();
});

test("«Table» shows the plan: a tab a workout, a row an exercise, a column a week", async () => {
  await shownPlans([MUSCLE, PUSH]);
  // A plan of before has no weeks, so no «Table».
  expect(screen.getAllByTestId("gym-plan-table-open")).toHaveLength(1);
  await fireEvent.press(screen.getByTestId("gym-plan-table-open"));

  expect(screen.getByRole("header", { name: "Table" })).toBeOnTheScreen();
  expect(screen.getByText(/^Muscle · 3 days/)).toBeOnTheScreen();
  expect(screen.getByTestId("plan-table-tab-0")).toHaveTextContent("A · Mon");
  for (const week of [1, 2, 3, 4]) {
    expect(screen.getByTestId(`plan-table-week-${week}`)).toHaveTextContent(
      new RegExp(`^Wk ${week}`),
    );
  }
  expect(screen.getByTestId("plan-table-week-4")).toHaveTextContent(/By hand/);
  expect(screen.getByText("Bench press")).toBeOnTheScreen();
  expect(screen.getByText("Push-up")).toBeOnTheScreen();
  // The bench press is not in the week written by hand.
  expect(screen.getByTestId("plan-table-cell-0-4")).toHaveTextContent("—");
  expect(screen.getByTestId("plan-table-cell-0-1")).toHaveTextContent(/4 × 10/);

  // Another workout: its own exercises.
  await fireEvent.press(screen.getByTestId("plan-table-tab-1"));
  expect(screen.getByText("Lat pulldown")).toBeOnTheScreen();
  expect(screen.queryByText("Bench press")).toBeNull();

  // «‹»: back to the plans.
  await fireEvent.press(screen.getByTestId("plan-table-back"));
  expect(screen.getByTestId("gym-plans")).toBeOnTheScreen();
});

test("a week's head opens the guide's «Weeks»", async () => {
  await shownPlans([MUSCLE]);
  await fireEvent.press(screen.getByTestId("gym-plan-table-open"));
  await fireEvent.press(screen.getByTestId("plan-table-week-2"));
  expect(screen.getByText("STEP 4 OF 5")).toBeOnTheScreen();
  expect(screen.getByTestId("wizard-week-4")).toHaveTextContent(/By hand/);
});

test("run days are a row each, the lighter week says so", async () => {
  await shownPlans([LIFT_AND_RUN]);
  await fireEvent.press(screen.getByTestId("gym-plan-table-open"));
  expect(screen.getByTestId("plan-table-week-4")).toHaveTextContent(/Lighter/);
  await fireEvent.press(screen.getByTestId("plan-table-tab-1"));
  expect(screen.getByTestId("plan-table-tab-1")).toHaveTextContent("Run · Tue");
  const table = screen.getByTestId("plan-table");
  expect(within(table).getByText("Easy run")).toBeOnTheScreen();
  expect(screen.getByTestId("plan-table-cell-0-1")).toHaveTextContent("5 km");
});
