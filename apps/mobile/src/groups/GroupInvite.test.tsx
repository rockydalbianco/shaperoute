/**
 * «Invite» (TASK-495 part B): people found by name, each invited once.
 */
import detail from "@shaperoute/shared-types/fixtures/group.json";
import members from "@shaperoute/shared-types/fixtures/group-members.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { GroupInvite, INVITE_SEARCH_DELAY_MS } from "./GroupInvite";
import { fakeApi, SignedIn } from "./testing";

const ID = detail.id;
const CLEO = members.members[2]!;

async function shown(fetchFn: typeof fetch) {
  await render(
    <SignedIn>
      <GroupInvite
        group={{ id: ID }}
        onBack={() => {}}
        onOpenProfile={() => {}}
        fetchFn={fetchFn}
        apiKey={null}
      />
    </SignedIn>,
  );
}

async function typed(text: string) {
  await fireEvent.changeText(screen.getByTestId("group-invite-search"), text);
  await act(async () => {
    await new Promise((done) => setTimeout(done, INVITE_SEARCH_DELAY_MS + 50));
  });
}

test("a name typed finds people, and «Invite» invites", async () => {
  const { fetchFn, calls } = fakeApi({
    "GET /users?q=cl": { status: 200, body: { people: [CLEO] } },
  });
  await shown(fetchFn);
  await typed("cl");
  await fireEvent.press(await screen.findByTestId(`invite-${CLEO.public_id}`));
  expect(calls).toEqual([
    { path: "/users?q=cl", method: "GET" },
    { path: `/groups/${ID}/invites/${CLEO.public_id}`, method: "PUT" },
  ]);
  expect(await screen.findByText("Invited")).toBeTruthy();
  expect(
    screen.getByTestId(`invite-${CLEO.public_id}`).props.accessibilityState.disabled,
  ).toBe(true);
});

test("one letter asks nothing; nobody found says so", async () => {
  const { fetchFn, calls } = fakeApi({
    "GET /users?q=zz": { status: 200, body: { people: [] } },
  });
  await shown(fetchFn);
  await typed("z");
  expect(calls).toEqual([]);
  await typed("zz");
  expect(await screen.findByText("Nobody found.")).toBeTruthy();
});
