/**
 * «Workout plan» of the Feed's «+» (TASK-485 part B, ADR-0394, the user's
 * texts of 2026-11-21): «Choose a plan», a line, «Who sees it: Everyone»
 * (changed there), «Post». The post is kept on the phone and goes up with
 * the phone's key, also when there is no network at first.
 */
import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { GymPlan, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { loadPlanPosts } from "../api/planPosts";
import { forgetPlans, mergePlans } from "../gym/plans";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { PlanPostFlow } from "./PlanPostFlow";

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
const OWNER = (session as Session).user.id;
const [, , MUSCLE, LIFT_AND_RUN] = plans.plans as GymPlan[];

async function show(fetchFn: jest.Mock, onDone = jest.fn()) {
  await render(
    <FollowsContext.Provider
      value={
        {
          apiUrl: "http://api",
          account: {
            state: { status: "signedIn", session: session as Session },
            sessionEnded: jest.fn(),
          },
          openProfile: jest.fn(),
        } as unknown as FollowsDoor
      }
    >
      <ActivitiesContext.Provider
        value={{ owner: OWNER, total: 0, list: [] } as unknown as ActivitiesDoor}
      >
        <PlanPostFlow onDone={onDone} fetchFn={fetchFn as unknown as typeof fetch} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
  return onDone;
}

/** No network for the plans posted; the plans' list as it is here. */
function offline() {
  return jest.fn(async (url: string) => {
    if (String(url).includes("/me/gym-plans")) {
      return Response.json({ plans: [MUSCLE, LIFT_AND_RUN] });
    }
    throw new TypeError("Network request failed");
  });
}

beforeEach(() => {
  files.clear();
  forgetPlans();
});

test("without plans: the way to make one", async () => {
  await show(jest.fn(async () => Response.json({ plans: [] })));
  expect(screen.getByText("Choose a plan")).toBeOnTheScreen();
  expect(screen.getByText("No plans yet: make one in Gym › Plans.")).toBeOnTheScreen();
});

test("a plan chosen, a line and «Post»: kept with the phone's key, without a network", async () => {
  mergePlans(OWNER, [MUSCLE, LIFT_AND_RUN]);
  const fetchFn = offline();
  const onDone = await show(fetchFn);
  expect(screen.getAllByTestId("plan-post-plan")).toHaveLength(2);
  await fireEvent.press(screen.getByText(LIFT_AND_RUN.name));
  expect(screen.getByTestId("plan-tile")).toBeOnTheScreen();
  expect(screen.getByText("Who sees it: Everyone")).toBeOnTheScreen();
  await fireEvent.changeText(
    screen.getByTestId("plan-post-line"),
    "  Two runs a week  ",
  );
  await fireEvent.press(screen.getByText("Post"));
  await act(async () => {});
  expect(onDone).toHaveBeenCalled();
  const [kept] = loadPlanPosts();
  expect(kept.key).toMatch(/^[a-z0-9]{8,40}$/);
  expect(kept.state).toBe("waiting");
  expect(kept.request.description).toBe("Two runs a week");
  expect(kept.request.visibility).toBe("everyone");
  // The copy, never its owner's first day nor paces.
  expect(kept.request.plan.name).toBe(LIFT_AND_RUN.name);
  expect(kept.request.plan.program).not.toHaveProperty("starts_on");
  expect(kept.request.plan.program).not.toHaveProperty("runner");
  // It tried to go up at once.
  expect(
    fetchFn.mock.calls.some(([url]) => String(url).includes("/me/plan-posts/")),
  ).toBe(true);
});

test("«Who sees it» changes to Followers before «Post»", async () => {
  mergePlans(OWNER, [MUSCLE]);
  await show(offline());
  await fireEvent.press(screen.getByText(MUSCLE.name));
  await fireEvent.press(screen.getByTestId("plan-post-who"));
  await fireEvent.press(screen.getByTestId("plan-post-who-followers"));
  expect(screen.getByText("Who sees it: Followers")).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Post"));
  await act(async () => {});
  expect(loadPlanPosts()[0].request).toMatchObject({
    visibility: "followers",
    description: null,
  });
});

test("with a network the post goes up and is remembered by its id", async () => {
  mergePlans(OWNER, [MUSCLE]);
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes("/me/plan-posts/") && init?.method === "PUT") {
      const key = String(url).split("/").at(-1);
      const body = JSON.parse(String(init.body));
      return Response.json({
        key,
        id: "5b8e2f14-6a3d-4c97-9e01-2d7f4a8c6b30",
        description: body.description,
        visibility: body.visibility,
        published_at: "2026-11-22T18:00:00Z",
        plan: body.plan,
      });
    }
    return Response.json({ plans: [MUSCLE] });
  });
  await show(fetchFn);
  await fireEvent.press(screen.getByText(MUSCLE.name));
  await fireEvent.press(screen.getByText("Post"));
  await act(async () => {});
  expect(loadPlanPosts()).toMatchObject([
    { state: "sent", id: "5b8e2f14-6a3d-4c97-9e01-2d7f4a8c6b30" },
  ]);
});
