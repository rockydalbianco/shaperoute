/**
 * The page of a group run (TASK-309 part B): what it says, «I'm going» and
 * «Not going», the organiser's «Edit» and «Cancel group run», «Cancelled»
 * and «Over», «Start» putting the route on the map as a favorite.
 */
import detail from "@shaperoute/shared-types/fixtures/group-run.json";
import group from "@shaperoute/shared-types/fixtures/group.json";
import outing from "@shaperoute/shared-types/fixtures/group-outing.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type {
  GroupOutingDetail as GroupRunDetail,
  Session,
} from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { AccountState } from "../account/useAccount";
import { FavoritesContext, type FavoritesDoor } from "../favorites/favoritesDoor";
import { FollowsContext } from "../social/followsDoor";
import { askedGroup, closeGroupPage } from "../groups/groupDoor";
import { saveSport } from "../settings/sport";
import { askedGroupRun, closeGroupRunPage, openGroupRunPage } from "./groupRunDoor";
import { favoriteOfGroupRun, GroupRunPage } from "./GroupRunPage";
import { askedRecord } from "./recordDoor";

jest.mock("../settings/sport", () => ({
  ...jest.requireActual("../settings/sport"),
  saveSport: jest.fn(),
}));

const RUN = detail as unknown as GroupRunDetail;
// Somebody else's group run, which the signed-in member does not go to.
const OTHERS: GroupRunDetail = {
  ...RUN,
  organiser: {
    public_id: "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44",
    username: "adam.trento",
    photo: null,
  },
  i_am_going: false,
  going: 1,
  people: [
    {
      public_id: "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44",
      username: "adam.trento",
      photo: null,
    },
  ],
};

type Call = { url: string; method: string };

/** A fake API: the group run as `runs` say, one answer after the other. */
function api(...runs: GroupRunDetail[]) {
  const calls: Call[] = [];
  let next = 0;
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url: url.replace("http://api", ""), method });
    if (method === "GET") {
      const run = runs[Math.min(next, runs.length - 1)];
      next += 1;
      return Response.json(run, { status: 200 });
    }
    return new Response(null, { status: 204 });
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, calls };
}

/** An outing of a group: the outing for its address, the group for the
 * group's, where the signed-in member is `me`. */
function outingApi(run: GroupRunDetail, me: string) {
  const fetchFn = jest.fn(async (url: string) =>
    url.includes("/groups/")
      ? Response.json({ ...group, id: run.group_id, me }, { status: 200 })
      : Response.json(run, { status: 200 }),
  );
  return fetchFn as unknown as typeof fetch;
}

async function shown(fetchFn: typeof fetch, show = jest.fn()) {
  const state: AccountState = { status: "signedIn", session: session as Session };
  const favorites = { show } as unknown as FavoritesDoor;
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <FollowsContext.Provider
        value={{
          apiUrl: "http://api",
          account: { state, sessionEnded: () => {} },
          openProfile: () => {},
        }}
      >
        <FavoritesContext.Provider value={favorites}>
          <GroupRunPage
            groupRunId={RUN.id}
            onBack={() => {}}
            fetchFn={fetchFn}
            apiKey={null}
          />
        </FavoritesContext.Provider>
      </FollowsContext.Provider>
    </SafeAreaProvider>,
  );
  return show;
}

afterEach(closeGroupRunPage);

test("it says the title, the place, the notes, the organiser and who goes", async () => {
  const { fetchFn } = api(OTHERS);
  await shown(fetchFn);
  expect(await screen.findByText(RUN.title)).toBeTruthy();
  expect(screen.getByText("MUSE entrance")).toBeTruthy();
  expect(screen.getByText(RUN.description!)).toBeTruthy();
  expect(screen.getByText("Organiser")).toBeTruthy();
  expect(screen.getByText("adam.trento")).toBeTruthy();
  expect(screen.getByText("1 going")).toBeTruthy();
});

test("«I'm going» goes, and the page reads the group run again", async () => {
  const { fetchFn, calls } = api(OTHERS, { ...OTHERS, i_am_going: true, going: 2 });
  await shown(fetchFn);
  await fireEvent.press(await screen.findByTestId("group-run-going"));
  expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
    `GET /group-runs/${RUN.id}`,
    `PUT /group-runs/${RUN.id}/going`,
    `GET /group-runs/${RUN.id}`,
  ]);
  expect(await screen.findByText("2 going")).toBeTruthy();
  expect(screen.getByText("You're going")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("group-run-not-going"));
  expect(calls[3]).toEqual({ url: `/group-runs/${RUN.id}/going`, method: "DELETE" });
});

test("the organiser edits or cancels it, after a question", async () => {
  const { fetchFn, calls } = api(RUN, { ...RUN, status: "cancelled" });
  const alert = jest.spyOn(Alert, "alert");
  await shown(fetchFn);
  expect(await screen.findByTestId("group-run-edit")).toBeTruthy();
  expect(screen.queryByTestId("group-run-going")).toBeNull();
  await fireEvent.press(screen.getByTestId("group-run-cancel"));
  const buttons = alert.mock.calls[0][2]!;
  expect(alert.mock.calls[0][1]).toBe(
    "Cancel this group run? Everyone going gets a notice.",
  );
  await buttons[1].onPress!();
  expect(calls[1]).toEqual({ url: `/group-runs/${RUN.id}`, method: "DELETE" });
  expect(await screen.findByText("Cancelled")).toBeTruthy();
  expect(screen.queryByTestId("group-run-start")).toBeNull();
  expect(screen.queryByTestId("group-run-edit")).toBeNull();
  alert.mockRestore();
});

test("over, nobody may say «I'm going» any more", async () => {
  const { fetchFn } = api({ ...OTHERS, status: "over" });
  await shown(fetchFn);
  expect(await screen.findByText("Over")).toBeTruthy();
  expect(screen.queryByTestId("group-run-going")).toBeNull();
});

test("«Start» puts the route on the map, and back comes to the page", async () => {
  const { fetchFn } = api(OTHERS);
  openGroupRunPage(RUN.id);
  const show = await shown(fetchFn);
  await fireEvent.press(await screen.findByTestId("group-run-start"));
  expect(show).toHaveBeenCalledWith(favoriteOfGroupRun(OTHERS), expect.any(Function));
  expect(askedGroupRun()).toBeNull();
  show.mock.calls[0][1]();
  expect(askedGroupRun()).toEqual({ id: RUN.id });
});

test("the route on the map is the group run's, point for point", () => {
  const favorite = favoriteOfGroupRun(RUN);
  expect(favorite.points).toEqual(RUN.points);
  expect(favorite.title).toBe(RUN.title);
  expect(favorite.id).toBe(`group-run-${RUN.id}`);
});

test("a name closes the page and opens the member's profile over the app", async () => {
  const { fetchFn } = api(OTHERS);
  const openProfile = jest.fn();
  const onBack = jest.fn();
  const state: AccountState = { status: "signedIn", session: session as Session };
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <FollowsContext.Provider
        value={{
          apiUrl: "http://api",
          account: { state, sessionEnded: () => {} },
          openProfile,
        }}
      >
        <GroupRunPage
          groupRunId={RUN.id}
          onBack={onBack}
          fetchFn={fetchFn}
          apiKey={null}
        />
      </FollowsContext.Provider>
    </SafeAreaProvider>,
  );
  await fireEvent.press(
    await screen.findByRole("button", { name: "adam.trento's profile" }),
  );
  expect(onBack).toHaveBeenCalled();
  expect(openProfile).toHaveBeenCalledWith(OTHERS.organiser);
});

// Somebody else's outing without a route (TASK-495 part C2).
const OUTING: GroupRunDetail = {
  ...(outing as unknown as GroupRunDetail),
  organiser: OTHERS.organiser,
  faces: [OTHERS.organiser],
  people: [OTHERS.organiser],
  i_am_going: false,
};

test("an outing without a route: its group, «Destination», no km", async () => {
  await shown(outingApi(OUTING, "member"));
  expect(await screen.findByTestId("group-run-destination")).toHaveTextContent(
    "Cima Tosa, normal route",
  );
  expect(screen.getByTestId("group-run-page")).not.toHaveTextContent(" km", {
    exact: false,
  });
  await fireEvent.press(screen.getByTestId("group-run-group"));
  expect(askedGroup()).toEqual({ id: OUTING.group_id });
  closeGroupPage();
});

test("«Start» of an outing without a route records its sport", async () => {
  openGroupRunPage(OUTING.id);
  const show = await shown(outingApi(OUTING, "member"));
  await fireEvent.press(await screen.findByTestId("group-run-start"));
  expect(show).not.toHaveBeenCalled();
  expect(saveSport).toHaveBeenCalledWith("alpinism");
  expect(askedRecord()).toEqual({ sport: "alpinism" });
  expect(askedGroupRun()).toBeNull();
});

test("the group's admin and co-admins may cancel an outing, not edit it", async () => {
  await shown(outingApi(OUTING, "coadmin"));
  expect(await screen.findByTestId("group-run-cancel")).toBeTruthy();
  expect(screen.queryByTestId("group-run-edit")).toBeNull();
});

test("a member who doesn't lead the group cannot cancel it", async () => {
  await shown(outingApi(OUTING, "member"));
  await screen.findByTestId("group-run-destination");
  expect(screen.queryByTestId("group-run-cancel")).toBeNull();
});
