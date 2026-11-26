/**
 * The requests to join a group (TASK-495 part B): accepted or refused, each
 * leaves the list and the group's page reads it again.
 */
import detail from "@shaperoute/shared-types/fixtures/group.json";
import members from "@shaperoute/shared-types/fixtures/group-members.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { GroupRequests } from "./GroupRequests";
import { fakeApi, SignedIn } from "./testing";

const ID = detail.id;
const [, BOB, CLEO] = members.members;
const ASKED = {
  [`GET /groups/${ID}/requests?limit=20`]: {
    status: 200,
    body: { people: [BOB, CLEO], next: null, total: 2 },
  },
};

async function shown(fetchFn: typeof fetch, onChanged = jest.fn()) {
  await render(
    <SignedIn>
      <GroupRequests
        group={{ id: ID }}
        onBack={() => {}}
        onChanged={onChanged}
        onOpenProfile={() => {}}
        fetchFn={fetchFn}
        apiKey={null}
      />
    </SignedIn>,
  );
  return onChanged;
}

test("a request accepted puts, one refused deletes, and both leave the list", async () => {
  const { fetchFn, calls } = fakeApi(ASKED);
  const onChanged = await shown(fetchFn);
  await fireEvent.press(await screen.findByTestId(`request-accept-${BOB!.public_id}`));
  expect(calls[1]).toEqual({
    path: `/groups/${ID}/requests/${BOB!.public_id}`,
    method: "PUT",
  });
  expect(screen.queryByText("bob")).toBeNull();
  await fireEvent.press(screen.getByTestId(`request-refuse-${CLEO!.public_id}`));
  expect(calls[2]).toEqual({
    path: `/groups/${ID}/requests/${CLEO!.public_id}`,
    method: "DELETE",
  });
  expect(onChanged).toHaveBeenCalledTimes(2);
  expect(await screen.findByText("No requests to join.")).toBeTruthy();
});

test("nobody asking says so", async () => {
  const { fetchFn } = fakeApi({
    [`GET /groups/${ID}/requests?limit=20`]: {
      status: 200,
      body: { people: [], next: null, total: 0 },
    },
  });
  await shown(fetchFn);
  expect(await screen.findByText("No requests to join.")).toBeTruthy();
});
