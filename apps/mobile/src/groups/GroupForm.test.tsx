/**
 * «New group» (TASK-495 part B): name, description, 1 to 3 sports, the city
 * with the phone's last point, the way in («Request to join» first); never
 * public with alpinism; the safety words above «Create»; the API's words
 * when it refuses; the same form changes a group, its photo included.
 */
import detail from "@shaperoute/shared-types/fixtures/group.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { GroupDetail, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { SAFETY } from "../groupRuns/GroupRunForm";
import { FollowsContext } from "../social/followsDoor";
import { GroupForm, type GroupFormMode, sportChoices } from "./GroupForm";
import { ALPINISM_SAFETY } from "./groupText";

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return {
    ...actual,
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    },
  };
});

const GROUP = detail as unknown as GroupDetail;
const HERE: [number, number] = [46.0679, 11.1211];

function fetchAnswering(...list: { status: number; body?: unknown }[]) {
  return jest.fn(async (_url: string, _init?: RequestInit) => {
    const next = list.shift()!;
    return next.status === 204
      ? new Response(null, { status: 204 })
      : Response.json(next.body, { status: next.status });
  });
}

async function shown(
  mode: GroupFormMode,
  fetchFn: jest.Mock,
  {
    onDone = jest.fn(),
    pick = jest.fn(async () => ({ kind: "cancelled" as const })),
  }: {
    onDone?: jest.Mock;
    pick?: jest.Mock;
  } = {},
) {
  const state: AccountState = { status: "signedIn", session: session as Session };
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: "http://api",
        account: { state, sessionEnded: () => {} },
        openProfile: () => {},
      }}
    >
      <GroupForm
        mode={mode}
        onClose={() => {}}
        onDone={onDone}
        locate={async () => HERE}
        pick={pick}
        fetchFn={fetchFn as unknown as typeof fetch}
        apiKey={null}
      />
    </FollowsContext.Provider>,
  );
  return onDone;
}

test("«Create» sends the group with the phone's point, «Request to join» first", async () => {
  const fetchFn = fetchAnswering({ status: 201, body: detail });
  const onDone = await shown({ kind: "new" }, fetchFn);
  expect(screen.getByText(SAFETY)).toBeTruthy();
  expect(screen.queryByText(ALPINISM_SAFETY)).toBeNull();
  expect(screen.getByTestId("group-access-request").props.accessibilityState).toEqual(
    expect.objectContaining({ selected: true }),
  );
  await fireEvent.changeText(screen.getByTestId("group-name"), "  Saturday Hikers ");
  await fireEvent.press(screen.getByTestId("group-sport-hiking"));
  await fireEvent.press(screen.getByTestId("group-sport-walking"));
  await fireEvent.changeText(screen.getByTestId("group-city"), "Trento");
  await fireEvent.press(screen.getByTestId("group-save"));
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/groups");
  expect(init?.method).toBe("POST");
  expect(JSON.parse(String(init?.body))).toEqual({
    name: "Saturday Hikers",
    description: null,
    sports: ["hiking", "walking"],
    city: "Trento",
    area: HERE,
    access: "request",
  });
  expect(onDone).toHaveBeenCalledWith(detail);
});

test("at most three sports; without a name nothing goes", async () => {
  const fetchFn = fetchAnswering({ status: 201, body: detail });
  await shown({ kind: "new" }, fetchFn);
  for (const sport of ["hiking", "walking", "running"]) {
    await fireEvent.press(screen.getByTestId(`group-sport-${sport}`));
  }
  const fourth = screen.getByTestId("group-sport-cycling");
  expect(fourth.props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(screen.getByTestId("group-city"), "Trento");
  expect(screen.getByTestId("group-save").props.accessibilityState.disabled).toBe(true);
});

test("with alpinism «Public» goes, and the alpinism words show", async () => {
  const fetchFn = fetchAnswering({ status: 201, body: detail });
  await shown({ kind: "new" }, fetchFn);
  await fireEvent.press(screen.getByTestId("group-access-public"));
  expect(
    screen.getByTestId("group-access-public").props.accessibilityState.selected,
  ).toBe(true);
  await fireEvent.press(screen.getByTestId("group-sport-alpinism"));
  expect(screen.getByText(ALPINISM_SAFETY)).toBeTruthy();
  const pub = screen.getByTestId("group-access-public");
  expect(pub.props.accessibilityState).toEqual({ selected: false, disabled: true });
  expect(
    screen.getByTestId("group-access-request").props.accessibilityState.selected,
  ).toBe(true);
});

test("a refusal shows the API's own words and keeps the form", async () => {
  const fetchFn = fetchAnswering({
    status: 422,
    body: {
      error: {
        code: "invalid_request",
        message: "You can be the admin of 5 groups at most.",
        suggested_distance_m: null,
        reason: null,
      },
    },
  });
  const onDone = await shown({ kind: "new" }, fetchFn);
  await fireEvent.changeText(screen.getByTestId("group-name"), "Hikers");
  await fireEvent.press(screen.getByTestId("group-sport-hiking"));
  await fireEvent.changeText(screen.getByTestId("group-city"), "Trento");
  await fireEvent.press(screen.getByTestId("group-save"));
  expect(
    await screen.findByText("You can be the admin of 5 groups at most."),
  ).toBeTruthy();
  expect(onDone).not.toHaveBeenCalled();
});

test("a negative text is refused as a comment is", async () => {
  const fetchFn = fetchAnswering({
    status: 422,
    body: {
      error: {
        code: "comment_rejected",
        message: "…",
        suggested_distance_m: null,
        reason: null,
      },
    },
  });
  await shown({ kind: "change", group: GROUP }, fetchFn);
  await fireEvent.press(screen.getByTestId("group-save"));
  expect(
    await screen.findByText(
      "You can't write negative comments in this app. Try another app.",
    ),
  ).toBeTruthy();
});

test("the admin changes the group whole, and the photo chosen goes after it", async () => {
  const withPhoto = { ...GROUP, photo: "BBBB", big_photo: "BBBB" };
  const fetchFn = fetchAnswering(
    { status: 200, body: GROUP },
    { status: 200, body: withPhoto },
  );
  const pick = jest.fn(async () => ({ kind: "picked" as const, base64: "AAAA" }));
  const onDone = await shown({ kind: "change", group: GROUP }, fetchFn, { pick });
  expect(screen.getByTestId("group-name").props.value).toBe(GROUP.name);
  await fireEvent.press(screen.getByTestId("group-choose-photo"));
  expect(await screen.findByTestId("group-form-photo")).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId("group-description"), "");
  await fireEvent.press(screen.getByTestId("group-save"));
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/groups/${GROUP.id}`);
  expect(init?.method).toBe("PUT");
  expect(JSON.parse(String(init?.body))).toEqual({
    name: GROUP.name,
    description: null,
    sports: GROUP.sports,
    city: GROUP.city,
    area: GROUP.area,
    access: GROUP.access,
  });
  expect(fetchFn.mock.calls[1][0]).toBe(`http://api/groups/${GROUP.id}/photo`);
  expect(JSON.parse(String(fetchFn.mock.calls[1][1]?.body))).toEqual({ image: "AAAA" });
  expect(onDone).toHaveBeenCalledWith(withPhoto);
});

test("the sports offered are the app's, each once", () => {
  const activities = sportChoices().map((choice) => choice.activity);
  expect(new Set(activities).size).toBe(activities.length);
  expect(activities).toEqual(expect.arrayContaining(["hiking", "cycling", "alpinism"]));
});
