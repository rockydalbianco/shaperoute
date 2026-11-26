/**
 * All the members of a group (TASK-495 part B): roles; the admin makes and
 * unmakes co-admins, passes the role after a question and removes members;
 * a co-admin removes members only.
 */
import detail from "@shaperoute/shared-types/fixtures/group.json";
import members from "@shaperoute/shared-types/fixtures/group-members.json";
import type { GroupDetail } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";

import { GroupMembers } from "./GroupMembers";
import { fakeApi, SignedIn } from "./testing";

const GROUP = detail as unknown as GroupDetail;
const ID = GROUP.id;
const [ADA, BOB, CLEO] = members.members as [
  (typeof members.members)[number],
  (typeof members.members)[number],
  (typeof members.members)[number],
];
const LIST = { [`GET /groups/${ID}/members?limit=20`]: { status: 200, body: members } };

async function shown(group: GroupDetail, fetchFn: typeof fetch, onChanged = jest.fn()) {
  await render(
    <SignedIn>
      <GroupMembers
        group={group}
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

test("the list says the roles; nothing may be done to the admin", async () => {
  const { fetchFn } = fakeApi(LIST);
  await shown(GROUP, fetchFn);
  expect(await screen.findByText("cleo")).toBeTruthy();
  expect(screen.getByText("Admin")).toBeTruthy();
  expect(screen.getByText("Co-admin")).toBeTruthy();
  expect(screen.queryByTestId(`member-more-${ADA.public_id}`)).toBeNull();
});

test("the admin makes a co-admin, and unmakes one", async () => {
  const { fetchFn, calls } = fakeApi(LIST);
  const onChanged = await shown(GROUP, fetchFn);
  await fireEvent.press(await screen.findByTestId(`member-more-${CLEO.public_id}`));
  await fireEvent.press(screen.getByTestId(`member-coadmin-${CLEO.public_id}`));
  const put = calls.find((c) => c.method === "PUT")!;
  expect(put.path).toBe(`/groups/${ID}/members/${CLEO.public_id}/role`);
  expect(onChanged).toHaveBeenCalled();
  await fireEvent.press(await screen.findByTestId(`member-more-${BOB.public_id}`));
  await fireEvent.press(screen.getByTestId(`member-uncoadmin-${BOB.public_id}`));
  const bodies = (fetchFn as jest.Mock).mock.calls
    .filter(([, init]) => (init as RequestInit | undefined)?.method === "PUT")
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
  expect(bodies).toEqual([{ role: "coadmin" }, { role: "member" }]);
});

test("passing the admin role and removing ask first", async () => {
  const { fetchFn, calls } = fakeApi(LIST);
  const alert = jest.spyOn(Alert, "alert");
  await shown(GROUP, fetchFn);
  await fireEvent.press(await screen.findByTestId(`member-more-${CLEO.public_id}`));
  await fireEvent.press(screen.getByTestId(`member-admin-${CLEO.public_id}`));
  expect(alert.mock.calls[0][1]).toBe("Make cleo the admin? You become a member.");
  await act(async () => {
    await alert.mock.calls[0][2]![1]!.onPress!();
  });
  expect(calls).toContainEqual({
    path: `/groups/${ID}/members/${CLEO.public_id}/role`,
    method: "PUT",
  });
  await fireEvent.press(await screen.findByTestId(`member-more-${CLEO.public_id}`));
  await fireEvent.press(screen.getByTestId(`member-remove-${CLEO.public_id}`));
  await act(async () => {
    await alert.mock.calls[1][2]![1]!.onPress!();
  });
  expect(calls).toContainEqual({
    path: `/groups/${ID}/members/${CLEO.public_id}`,
    method: "DELETE",
  });
  alert.mockRestore();
});

test("a co-admin removes members only", async () => {
  const { fetchFn } = fakeApi(LIST);
  await shown({ ...GROUP, me: "coadmin" }, fetchFn);
  await fireEvent.press(await screen.findByTestId(`member-more-${CLEO.public_id}`));
  expect(screen.getByTestId(`member-remove-${CLEO.public_id}`)).toBeTruthy();
  expect(screen.queryByTestId(`member-coadmin-${CLEO.public_id}`)).toBeNull();
  expect(screen.queryByTestId(`member-more-${BOB.public_id}`)).toBeNull();
});

test("a member only looks", async () => {
  const { fetchFn } = fakeApi(LIST);
  await shown({ ...GROUP, me: "member" }, fetchFn);
  expect(await screen.findByText("cleo")).toBeTruthy();
  expect(screen.queryByTestId(`member-more-${CLEO.public_id}`)).toBeNull();
});

test("the API's words when it refuses: three co-admins already", async () => {
  const words = "A group has 3 co-admins at most.";
  const { fetchFn } = fakeApi({
    ...LIST,
    [`PUT /groups/${ID}/members/${CLEO.public_id}/role`]: {
      status: 422,
      body: {
        error: {
          code: "invalid_request",
          message: words,
          suggested_distance_m: null,
          reason: null,
        },
      },
    },
  });
  await shown(GROUP, fetchFn);
  await fireEvent.press(await screen.findByTestId(`member-more-${CLEO.public_id}`));
  await fireEvent.press(screen.getByTestId(`member-coadmin-${CLEO.public_id}`));
  expect(await screen.findByText(words)).toBeTruthy();
});
