/**
 * «Groups near you» at the end of «Explore» and the search behind «See
 * all» (TASK-495 part D): the groups near the start, by name anywhere, of
 * a sport; a touch opens the page; nothing signed out or from an API of
 * before.
 */
import found from "@shaperoute/shared-types/fixtures/groups.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ExploreGroups, GroupSearch } from "./ExploreGroups";
import { askedGroup, closeGroupPage } from "./groupDoor";
import { fakeApi, SignedIn } from "./testing";

const NEAR = "GET /groups?lat=46.07&lon=11.12";
const path = (call: string) => call.slice("GET ".length);
const signedIn = (): string | null => "the-token";

afterEach(() => closeGroupPage());

async function row(
  answers: Parameters<typeof fakeApi>[0],
  { near = [46.07, 11.12] as [number, number] | null, readToken = signedIn } = {},
) {
  const api = fakeApi(answers);
  const onSeeAll = jest.fn();
  await render(
    <ExploreGroups
      apiUrl="http://api"
      near={near}
      width={358}
      onSeeAll={onSeeAll}
      readToken={readToken}
      fetchFn={api.fetchFn}
    />,
  );
  return { ...api, onSeeAll };
}

test("the groups near the start in a row; a touch opens the page, «See all» the search", async () => {
  const { calls, onSeeAll } = await row({ [NEAR]: { status: 200, body: found } });
  const first = found.groups[0]!;
  expect(await screen.findByText(first.name)).toBeTruthy();
  expect(screen.getByText("GROUPS NEAR YOU")).toBeTruthy();
  expect(calls).toEqual([{ method: "GET", path: path(NEAR) }]);
  await fireEvent.press(screen.getByTestId(`group-card-${first.id}`));
  expect(askedGroup()).toEqual({ id: first.id });
  await fireEvent.press(screen.getByTestId("explore-groups-all"));
  expect(onSeeAll).toHaveBeenCalledTimes(1);
});

test("none near: a word, and «See all» still", async () => {
  await row({ [NEAR]: { status: 200, body: { groups: [] } } });
  expect(await screen.findByText("No groups near you yet.")).toBeTruthy();
  expect(screen.getByTestId("explore-groups-all")).toBeTruthy();
});

test("without a start, only «See all»: nothing is asked", async () => {
  const { calls } = await row({}, { near: null });
  expect(screen.getByTestId("explore-groups-all")).toBeTruthy();
  expect(calls).toEqual([]);
});

test("signed out: nothing at all, nothing asked", async () => {
  const { calls } = await row({}, { readToken: () => null });
  expect(screen.queryByTestId("explore-groups")).toBeNull();
  expect(calls).toEqual([]);
});

test("an API of before: nothing at all", async () => {
  const { calls } = await row({
    [NEAR]: { status: 404, body: { error: { code: "http_error" } } },
  });
  await waitFor(() => expect(calls).toHaveLength(1));
  await waitFor(() => expect(screen.queryByTestId("explore-groups")).toBeNull());
});

async function search(
  answers: Parameters<typeof fakeApi>[0],
  near: [number, number] | null = [46.07, 11.12],
) {
  const api = fakeApi(answers);
  const onBack = jest.fn();
  await render(
    <SignedIn>
      <GroupSearch
        apiUrl="http://api"
        near={near}
        onBack={onBack}
        readToken={signedIn}
        fetchFn={api.fetchFn}
      />
    </SignedIn>,
  );
  return { ...api, onBack };
}

test("the search: near the start first, then by name, then of a sport", async () => {
  const byName = "GET /groups?q=dolo";
  const ofSport = "GET /groups?q=dolo&sport=hiking";
  const { calls } = await search({
    [NEAR]: { status: 200, body: found },
    [byName]: { status: 200, body: { groups: [] } },
    [ofSport]: { status: 200, body: found },
  });
  const first = found.groups[0]!;
  expect(await screen.findByText(first.name)).toBeTruthy();

  await fireEvent.changeText(screen.getByTestId("group-search-name"), "dolo");
  expect(await screen.findByText("No group found.")).toBeTruthy();

  await fireEvent.press(screen.getByTestId("group-search-sport-hiking"));
  expect(await screen.findByText(first.name)).toBeTruthy();
  await fireEvent.press(screen.getByTestId(`group-card-${first.id}`));
  expect(askedGroup()).toEqual({ id: first.id });
  expect(calls.map((call) => call.path)).toEqual([NEAR, byName, ofSport].map(path));
});

test("the search without a start wants two letters; one is not enough", async () => {
  const { calls } = await search({}, null);
  expect(screen.getByText("Write at least 2 letters of a group's name.")).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId("group-search-name"), " d ");
  await new Promise((done) => setTimeout(done, 400));
  expect(screen.getByText("Write at least 2 letters of a group's name.")).toBeTruthy();
  expect(calls).toEqual([]);
});

test("the search that fails says so", async () => {
  await search({ [NEAR]: { status: 500, body: {} } });
  expect(
    await screen.findByText(
      "The groups could not load. Check the connection and try again.",
    ),
  ).toBeTruthy();
});
