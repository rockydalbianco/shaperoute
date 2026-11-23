import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import vo2maxSettings from "@shaperoute/shared-types/fixtures/vo2max-settings.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { PublicProfile, Session, Vo2Max } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import { answers } from "../account/testing";
import { UserProfilePage } from "./UserProfilePage";
import { measuredDay, vo2maxSourceText, Vo2MaxRow } from "./Vo2MaxRow";

// The VO₂ max of a profile (TASK-397): the number, its unit and where it
// comes from, with the texts the user approved.

const fromHealth = vo2maxSettings.vo2max as Vo2Max;
const estimate: Vo2Max = {
  value: 52,
  source: "estimate",
  measured_on: "2026-10-18",
  from_distance: "10k",
};

test("the day is the one written, never moved by a time zone", () => {
  expect(measuredDay("2026-11-03")).toBe("3 Nov");
  expect(measuredDay("2026-01-31")).toBe("31 Jan");
  expect(measuredDay("not a day")).toBe("");
});

test("Health says the watch and the day, the estimate its best: «your» or «their»", () => {
  expect(vo2maxSourceText(fromHealth, false)).toBe("Apple Watch · 3 Nov");
  expect(vo2maxSourceText({ ...fromHealth, source: "health_connect" }, true)).toBe(
    "Health Connect · 3 Nov",
  );
  expect(vo2maxSourceText(estimate, true)).toBe("Estimate from your 10K");
  expect(vo2maxSourceText(estimate, false)).toBe("Estimate from their 10K");
  expect(vo2maxSourceText({ ...estimate, from_distance: "half" }, false)).toBe(
    "Estimate from their Half marathon",
  );
});

test("the row: «VO₂ max», the number in ml/kg/min, read as one", async () => {
  await render(<Vo2MaxRow vo2max={estimate} />);
  expect(screen.getByText("VO₂ max")).toBeOnTheScreen();
  expect(screen.getByText("52")).toBeOnTheScreen();
  expect(screen.getByText("ml/kg/min")).toBeOnTheScreen();
  expect(
    screen.getByLabelText("VO₂ max, 52 ml/kg/min, Estimate from their 10K"),
  ).toBeOnTheScreen();
});

const URL = "http://api";
const signedIn = { status: "signedIn", session: session as Session } as const;

async function showProfile(profile: PublicProfile) {
  const fetchFn: jest.Mock = answers({ status: 200, body: profile });
  await render(
    <UserProfilePage
      apiUrl={URL}
      account={{ state: signedIn, sessionEnded: jest.fn() }}
      publicId={profile.public_id}
      fetchFn={fetchFn}
      apiKey={null}
    />,
  );
  await screen.findByText(profile.username);
}

test("another member's profile shows it after their yes, with «their»", async () => {
  // Another member's: the fixture's is the session's own.
  const other = "5d2e9b47-1c3a-4f8e-a6b0-7e9d2c4f1a38";
  await showProfile({
    ...(publicProfile as PublicProfile),
    public_id: other,
    vo2max: estimate,
  });
  expect(screen.getByTestId("vo2max")).toBeOnTheScreen();
  expect(screen.getByText("Estimate from their 10K")).toBeOnTheScreen();
});

test("one's own profile, opened as the others see it, says «your»", async () => {
  await showProfile({ ...(publicProfile as PublicProfile), vo2max: estimate });
  expect(screen.getByText("Estimate from your 10K")).toBeOnTheScreen();
});

test("without the yes the API sends null, and there is no row", async () => {
  await showProfile({ ...(publicProfile as PublicProfile), vo2max: null });
  expect(screen.queryByTestId("vo2max")).toBeNull();
});
