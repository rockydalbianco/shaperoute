/**
 * A gym plan posted, in the Feed (TASK-485 part B, ADR-0394, the user's
 * choices of 2026-11-21): the tile with the name, goal, days and weeks, the
 * sports and the week; the plan whole with its kg when tapped; «Use this
 * plan», but not on one's own post, opens the guide's last step and keeps
 * a new plan with the kg; with 20 plans already, the message.
 */
import feed from "@shaperoute/shared-types/fixtures/feed.json";
import myPost from "@shaperoute/shared-types/fixtures/my-plan-post.json";
import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type {
  FeedPost as Post,
  GymPlan,
  GymPlanPosted,
  Session,
} from "@shaperoute/shared-types";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { Alert } from "react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { keepPlanPost, sendWaitingPlanPosts } from "../api/planPosts";
import { forgetPlans, mergePlans, plansOf } from "../gym/plans";
import { forgetPaceAsked } from "../gym/runPace";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { FeedPost } from "./FeedPost";
import { forgetFeedMaps } from "./FeedMaps";
import { shownPost } from "./feedPosts";
import { planItemText, planWeekLine } from "./PlanPostTile";

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
const PLAN = myPost.plan as GymPlanPosted;
const OWN = feed.posts[0] as Post;
const ADAM = {
  public_id: "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44",
  username: "adam.trento",
};
/** A plan posted, as GET /feed gives it to an app that says `plans`. */
function planPost(author = ADAM, plan: GymPlanPosted = PLAN): Post {
  return {
    ...OWN,
    id: myPost.id,
    author,
    title: null,
    place: null,
    shape: null,
    distance_m: 0,
    duration_s: 0,
    score: null,
    fidelity: null,
    activity: undefined,
    photos: [],
    track_preview: [],
    description: myPost.description,
    source: "plan",
    plan,
  } as unknown as Post;
}
/** A plan with kg: Monday's leg press, 3 × 12 at 80 kg. */
const WITH_KG: GymPlanPosted = {
  ...PLAN,
  program: {
    ...PLAN.program!,
    sessions: [
      {
        day: 1,
        name: "Full body A",
        items: [
          { exercise: "bench_press", kind: "load", sets: 4, reps: 10, load_kg: 60 },
        ],
      },
      ...PLAN.program!.sessions.slice(1),
    ],
  },
};

/** The API: what is asked and kept, nothing else. */
const sent: { url: string; init?: RequestInit }[] = [];
function api(url: string, init?: RequestInit): Promise<Response> {
  sent.push({ url: String(url), init });
  if (init?.method === "PUT") {
    const key = String(url).split("/").at(-1);
    return Promise.resolve(
      Response.json({ ...JSON.parse(String(init.body)), key }, { status: 201 }),
    );
  }
  if (String(url).includes("/me/gym-plans")) {
    return Promise.resolve(Response.json({ plans: [] }));
  }
  return Promise.resolve(Response.json({}, { status: 404 }));
}

async function show(post: Post) {
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
        <FeedPost post={shownPost(post)} width={358} onOpen={jest.fn()} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

beforeEach(() => {
  files.clear();
  forgetPlans();
  forgetFeedMaps();
  forgetPaceAsked();
  alert.mockClear();
  sent.length = 0;
  global.fetch = jest.fn(api) as unknown as typeof fetch;
});

test("the tile says the plan: name and goal, days and weeks, sports, the week", async () => {
  await show(planPost());
  const tile = screen.getByTestId("plan-tile");
  expect(within(tile).getByText("WORKOUT PLAN")).toBeOnTheScreen();
  expect(within(tile).getByText("Lift and run · Get back in shape")).toBeOnTheScreen();
  expect(within(tile).getByText("4 days a week · 4 weeks")).toBeOnTheScreen();
  expect(within(tile).getByText("Gym · Running")).toBeOnTheScreen();
  // The author's line, above.
  expect(within(tile).getByText(myPost.description)).toBeOnTheScreen();
  expect(
    screen.getAllByTestId("plan-tile-day", { includeHiddenElements: true }),
  ).toHaveLength(4);
  expect(
    screen.getAllByTestId("plan-tile-rest", { includeHiddenElements: true }),
  ).toHaveLength(3);
  // Never run: no map, no numbers.
  expect(screen.queryByTestId("feed-post")).toBeNull();
  expect(screen.getByRole("button", { name: "Use this plan" })).toBeOnTheScreen();
});

test("tapped, the plan opens whole, with its kg and its runs by name", async () => {
  await show(planPost(ADAM, WITH_KG));
  await fireEvent.press(screen.getByTestId("plan-tile-open"));
  const page = screen.getByTestId("plan-detail");
  expect(within(page).getByText("A · Mon")).toBeOnTheScreen();
  expect(within(page).getByText(/× 10 · 60 kg$/)).toBeOnTheScreen();
  expect(within(page).getByText("Tue — Easy run · 5 km")).toBeOnTheScreen();
  expect(within(page).getByText("Sat — Long run · 60 min")).toBeOnTheScreen();
  expect(within(page).getByTestId("plan-detail-use")).toBeOnTheScreen();
});

test("on one's own post there is no «Use this plan»", async () => {
  await show(planPost(OWN.author));
  expect(screen.queryByRole("button", { name: "Use this plan" })).toBeNull();
  await fireEvent.press(screen.getByTestId("plan-tile-open"));
  expect(screen.queryByTestId("plan-detail-use")).toBeNull();
  // Not posted from this phone: nothing to delete it with here.
  expect(screen.queryByTestId("plan-detail-delete")).toBeNull();
});

test("one's own post, posted from this phone, can be deleted", async () => {
  keepPlanPost(OWNER, myPost.key, { plan: PLAN, visibility: "everyone" }, 1);
  await sendWaitingPlanPosts("http://api", "token", OWNER, {
    fetchFn: jest.fn(async () => Response.json(myPost)) as unknown as typeof fetch,
  });
  await show(planPost(OWN.author));
  await fireEvent.press(screen.getByTestId("plan-tile-open"));
  await fireEvent.press(screen.getByTestId("plan-detail-delete"));
  expect(alert).toHaveBeenCalledWith(
    "Delete this post?",
    "Copies already made stay with whoever made them.",
    expect.anything(),
  );
});

test("«Use this plan» opens the guide's last steps and keeps a new plan with the kg", async () => {
  await show(planPost(ADAM, WITH_KG));
  await fireEvent.press(screen.getByRole("button", { name: "Use this plan" }));
  expect(screen.getByTestId("plan-wizard")).toBeOnTheScreen();
  // With runs: «How do you run today?» first, then the name and first day.
  expect(screen.getByText("STEP 1 OF 2")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("wizard-next"));
  await fireEvent.press(screen.getByTestId("wizard-next"));
  expect(screen.getByText("STEP 2 OF 2")).toBeOnTheScreen();
  expect(screen.getByText("Save plan")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("wizard-next"));
  await act(async () => {});
  const [kept] = plansOf(OWNER);
  expect(kept.name).toBe("Lift and run");
  expect(kept.program?.sessions[0].items[0].load_kg).toBe(60);
  expect(kept.program?.runner).toBeDefined();
  expect(kept.program?.target).toBeUndefined();
  expect(screen.getByTestId("plan-added")).toHaveTextContent("Added to your plans");
  expect(
    sent.some(
      (one) => one.url.includes("/me/gym-plans/") && one.init?.method === "PUT",
    ),
  ).toBe(true);
});

test("a plan without runs opens on the name and first day", async () => {
  const strength: GymPlanPosted = {
    ...WITH_KG,
    days: [1],
    program: { ...WITH_KG.program!, sessions: [WITH_KG.program!.sessions[0]] },
  };
  await show(planPost(ADAM, strength));
  await fireEvent.press(screen.getByRole("button", { name: "Use this plan" }));
  expect(screen.getByText("STEP 1 OF 1")).toBeOnTheScreen();
  expect(screen.getByText("Save plan")).toBeOnTheScreen();
});

test("with 20 plans already, the message and no guide", async () => {
  const push = plans.plans[0] as GymPlan;
  mergePlans(
    OWNER,
    Array.from({ length: 20 }, (_, i) => ({
      ...push,
      key: `k${i}aaaaaaaa`,
      position: i,
    })),
  );
  await show(planPost());
  await fireEvent.press(screen.getByRole("button", { name: "Use this plan" }));
  expect(alert).toHaveBeenCalledWith(
    "You already have 20 plans: delete one to add this.",
  );
  expect(screen.queryByTestId("plan-wizard")).toBeNull();
});

test("the words of the plan: days a week, weeks, sets with kg", () => {
  expect(planWeekLine({ name: "One", days: [3], items: [] })).toBe(
    "1 day a week · 1 week",
  );
  expect(
    planItemText({ exercise: "plank", kind: "timed", sets: 3, duration_s: 45 }, "en"),
  ).toBe("Plank 3 × 0:45");
  expect(
    planItemText({ name: "Sled", kind: "load", sets: 2, reps: 8, load_kg: 22.5 }, "en"),
  ).toBe("Sled 2 × 8 · 22.5 kg");
});
