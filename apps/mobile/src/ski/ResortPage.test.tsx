import type { SkiResort } from "@shaperoute/shared-types";
import resorts from "@shaperoute/shared-types/fixtures/ski-resorts.json";
import weather from "@shaperoute/shared-types/fixtures/ski-resort-weather.json";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { Linking } from "react-native";

import { answers } from "../account/testing";
import { elevationsLabel, ResortPage, websiteOf } from "./ResortPage";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const API = "http://api";
const FULL = resorts.resorts[0] as SkiResort;
const BARE = resorts.resorts[1] as SkiResort;

function page(resort: SkiResort, onBack = jest.fn()) {
  const fetchFn: jest.Mock = answers({ status: 200, body: weather });
  return (
    <ResortPage
      resort={resort}
      apiUrl={API}
      onBack={onBack}
      fetchFn={fetchFn}
      apiKey={null}
    />
  );
}

test("the altitudes once with their unit, one, or none", () => {
  expect(elevationsLabel(FULL, "km")).toBe("1,200–2,500 m");
  expect(elevationsLabel({ ...FULL, max_elevation_m: 1200 }, "km")).toBe("1,200 m");
  expect(elevationsLabel({ ...FULL, min_elevation_m: null }, "km")).toBe("2,500 m");
  expect(elevationsLabel(BARE, "km")).toBeNull();
});

test("only a web address opens as the website", () => {
  expect(websiteOf(FULL)).toBe("https://alpebianca.example/");
  expect(websiteOf({ ...FULL, website: "javascript:alert(1)" })).toBeNull();
  expect(websiteOf(BARE)).toBeNull();
});

test("the page has the lifts, the pistes by difficulty, the weather and the credits", async () => {
  await render(page(FULL));
  expect(screen.getByText("Alpe Bianca")).toBeOnTheScreen();
  expect(screen.getByText("Trentino-Alto Adige")).toBeOnTheScreen();
  expect(screen.getByTestId("lifts")).toHaveTextContent("24Lifts");
  expect(screen.getByTestId("pistes")).toHaveTextContent("117.8 kmPistes");
  expect(screen.getByTestId("elevations")).toHaveTextContent("1,200–2,500 m");
  const difficulties = within(screen.getByTestId("difficulties"));
  // From the easiest, only those the resort has.
  expect(
    difficulties.getAllByText(/^[A-Z]/).map((text) => text.props.children),
  ).toEqual(["Easy", "Intermediate", "Advanced", "Freeride"]);
  expect(difficulties.getByText("35.9 km")).toBeOnTheScreen();
  expect(await screen.findByTestId("weather-base")).toBeOnTheScreen();
  expect(
    screen.getByText(
      "Weather: MET Norway (CC BY 4.0) · Resorts: OpenSkiMap.org, © OpenStreetMap contributors",
    ),
  ).toBeOnTheScreen();
});

test("the website opens in the browser; «Back» goes back", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  const onBack = jest.fn();
  await render(page(FULL, onBack));
  await fireEvent.press(screen.getByTestId("resort-website"));
  expect(open).toHaveBeenCalledWith("https://alpebianca.example/");
  await fireEvent.press(screen.getByTestId("resort-back"));
  expect(onBack).toHaveBeenCalled();
  open.mockRestore();
});

test("a resort with little known shows what there is", async () => {
  await render(page(BARE));
  expect(screen.getByTestId("lifts")).toHaveTextContent("3Lifts");
  expect(screen.queryByTestId("difficulties")).toBeNull();
  expect(screen.queryByTestId("elevations")).toBeNull();
  expect(screen.queryByTestId("resort-website")).toBeNull();
  expect(await screen.findByTestId("resort-weather")).toBeOnTheScreen();
});
