/**
 * «Groups» on one's own profile (TASK-495 part B): one's groups, the
 * invites, «New group»; a touch opens the page; nothing from an API of
 * before.
 */
import mine from "@shaperoute/shared-types/fixtures/my-groups.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import {
  askedGroup,
  askedGroupForm,
  closeGroupForm,
  closeGroupPage,
} from "./groupDoor";
import { ProfileGroups } from "./ProfileGroups";

function answering(status: number, body: unknown) {
  return jest.fn(async () =>
    Response.json(body, { status }),
  ) as unknown as typeof fetch;
}

async function shown(fetchFn: typeof fetch) {
  await render(
    <ProfileGroups
      apiUrl="http://api"
      token="t"
      onSessionEnded={() => {}}
      fetchFn={fetchFn}
      apiKey={null}
    />,
  );
}

afterEach(() => {
  closeGroupPage();
  closeGroupForm();
});

test("one's groups and invites; a touch opens the page, «New group» the form", async () => {
  await shown(answering(200, mine));
  expect(await screen.findByText("Groups")).toBeTruthy();
  expect(screen.getByText(mine.groups[0]!.name)).toBeTruthy();
  expect(screen.getByText("Invites")).toBeTruthy();
  const invite = mine.invites[0]!;
  await fireEvent.press(screen.getByTestId(`group-card-${invite.id}`));
  expect(askedGroup()).toEqual({ id: invite.id });
  await act(async () => closeGroupPage());
  await fireEvent.press(await screen.findByTestId("profile-new-group"));
  expect(askedGroupForm()).toEqual({ kind: "new" });
});

test("no group yet: a word, and «New group»", async () => {
  await shown(answering(200, { groups: [], invites: [] }));
  expect(
    await screen.findByText("Go out together: make a group, or join one."),
  ).toBeTruthy();
  expect(screen.getByTestId("profile-new-group")).toBeTruthy();
});

test("an API of before, nothing", async () => {
  await shown(
    answering(404, {
      error: {
        code: "http_error",
        message: "Not Found",
        suggested_distance_m: null,
        reason: null,
      },
    }),
  );
  await new Promise((done) => setTimeout(done, 0));
  expect(screen.queryByTestId("profile-groups")).toBeNull();
});
