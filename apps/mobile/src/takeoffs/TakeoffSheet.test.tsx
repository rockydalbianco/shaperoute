import history from "@shaperoute/shared-types/fixtures/flying-site-history.json";
import detail from "@shaperoute/shared-types/fixtures/flying-site.json";
import type { FlyingSite, FlyingSiteDetail } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { answers } from "../account/testing";
import {
  barShares,
  compassLabel,
  nearLine,
  siteName,
  TakeoffSheet,
} from "./TakeoffSheet";

const API = "http://api";
const site = (detail as FlyingSiteDetail).site;
const near = (detail as FlyingSiteDetail).near;

test("the compass points in each language's letters", () => {
  expect(compassLabel("WSW", "en")).toBe("WSW");
  expect(compassLabel("WSW", "it")).toBe("OSO");
  expect(compassLabel("NW", "fr")).toBe("NO");
  expect(compassLabel("SE", "es")).toBe("SE");
  expect(compassLabel("ENE", "de")).toBe("ONO");
});

test("a site without a name says what it is", () => {
  expect(siteName(site)).toBe("Monte Prova");
  expect(siteName({ ...site, name: null })).toBe("Unnamed takeoff");
  expect(siteName({ ...near[0], name: null })).toBe("Unnamed landing");
});

test("a landing near: how far, and how much lower when both altitudes are known", () => {
  expect(nearLine(site, near[0], "km")).toBe("2.7 km away · 800 m lower");
  const noHeight: FlyingSite = { ...near[1], ele_m: null };
  expect(nearLine(site, noHeight, "km")).toBe("8.9 km");
});

test("the months as shares of the busiest", () => {
  expect(barShares([{ flights: 0 }, { flights: 3 }, { flights: 1 }])).toEqual([
    0,
    1,
    1 / 3,
  ]);
  expect(barShares([{ flights: 0 }])).toEqual([0]);
});

test("a takeoff's card: altitude, faces, its landings, flights, who flies now, records", async () => {
  const fetchFn = answers(
    { status: 200, body: detail },
    { status: 200, body: history },
  );
  await render(
    <TakeoffSheet
      siteId={101}
      baseUrl={API}
      onClose={jest.fn()}
      fetchFn={fetchFn as jest.Mock}
    />,
  );
  expect(await screen.findByText("Monte Prova")).toBeTruthy();
  expect(screen.getByText("Takeoff · 1,200 m · Official site")).toBeTruthy();
  expect(screen.getByTestId("takeoff-faces").props.children.join("")).toContain(
    "SE, S, SW",
  );
  expect(screen.getByText("Campo Prova")).toBeTruthy();
  expect(screen.getByText("14 flights by 6 pilots")).toBeTruthy();
  expect(screen.getByText("Today: 2")).toBeTruthy();
  expect(screen.getByText("In the air now: 2")).toBeTruthy();
  // One live share shared with everyone: one button.
  expect(screen.getAllByText("Watch live")).toHaveLength(1);
  expect(screen.getByTestId("takeoff-record-Longest flight")).toBeTruthy();
  expect(screen.queryByTestId("takeoff-record-Farthest")).toBeNull();
  expect(fetchFn.mock.calls[1][0]).toMatch(
    /\/flying-sites\/101\/history\?utc_offset_min=/,
  );
});

test("under three pilots, no numbers", async () => {
  const few = {
    ...history,
    few: true,
    flights: null,
    pilots: null,
    today: null,
    months: null,
  };
  const fetchFn = answers({ status: 200, body: detail }, { status: 200, body: few });
  await render(
    <TakeoffSheet
      siteId={101}
      baseUrl={API}
      onClose={jest.fn()}
      fetchFn={fetchFn as jest.Mock}
    />,
  );
  expect(await screen.findByText("Few flights from here yet.")).toBeTruthy();
  expect(screen.queryByTestId("takeoff-months")).toBeNull();
});

test("a landing has no history, only the takeoffs above it", async () => {
  const landing = {
    site: { ...near[0], away_m: null },
    near: [{ ...site, away_m: 2717 }],
    attribution: "©",
  };
  const fetchFn = answers({ status: 200, body: landing });
  await render(
    <TakeoffSheet
      siteId={102}
      baseUrl={API}
      onClose={jest.fn()}
      fetchFn={fetchFn as jest.Mock}
    />,
  );
  expect(await screen.findByText("Takeoffs above")).toBeTruthy();
  expect(screen.queryByTestId("takeoff-history")).toBeNull();
  expect(fetchFn).toHaveBeenCalledTimes(1);
});

test("a site that does not load can be asked again", async () => {
  const fetchFn = answers(
    { status: 500 },
    { status: 200, body: detail },
    { status: 200, body: history },
  );
  await render(
    <TakeoffSheet
      siteId={101}
      baseUrl={API}
      onClose={jest.fn()}
      fetchFn={fetchFn as jest.Mock}
    />,
  );
  await fireEvent.press(await screen.findByTestId("takeoff-retry"));
  expect(await screen.findByText("Monte Prova")).toBeTruthy();
});
