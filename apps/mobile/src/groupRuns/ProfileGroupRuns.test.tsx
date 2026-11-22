/**
 * The group runs of a profile (TASK-309 part B): coming, then «Past»; a
 * touch opens the page; nothing without any, nor from an API of before.
 */
import ofProfile from "@shaperoute/shared-types/fixtures/group-runs-of-profile.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { askedGroupRun, closeGroupRunPage } from "./groupRunDoor";
import { ProfileGroupRuns } from "./ProfileGroupRuns";

const PERSON = "8c1f7a52-3d4e-4b9a-9f61-2a7c0e5d9b13";

function answering(status: number, body: unknown) {
  return jest.fn(async () =>
    Response.json(body, { status }),
  ) as unknown as typeof fetch;
}

async function shown(fetchFn: typeof fetch) {
  await render(
    <ProfileGroupRuns
      apiUrl="http://api"
      token="t"
      publicId={PERSON}
      onSessionEnded={() => {}}
      fetchFn={fetchFn}
      apiKey={null}
    />,
  );
}

afterEach(closeGroupRunPage);

test("coming first, then «Past»; a touch opens the page", async () => {
  await shown(answering(200, ofProfile));
  expect(await screen.findByText("Group runs")).toBeTruthy();
  const [first] = ofProfile.upcoming;
  if (ofProfile.past.length > 0) {
    expect(screen.getByText("Past")).toBeTruthy();
  }
  await fireEvent.press(screen.getByTestId(`group-run-card-${first!.id}`));
  expect(askedGroupRun()).toEqual({ id: first!.id });
});

test("none, nothing", async () => {
  await shown(answering(200, { upcoming: [], past: [] }));
  await new Promise((done) => setTimeout(done, 0));
  expect(screen.queryByTestId("profile-group-runs")).toBeNull();
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
  expect(screen.queryByTestId("profile-group-runs")).toBeNull();
});
