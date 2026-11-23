import weather from "@shaperoute/shared-types/fixtures/ski-resort-weather.json";
import { render, screen } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import {
  altitudeLabel,
  grouped,
  HOUR_STEP,
  ResortWeather,
  shownHours,
  snowLabel,
  symbolSign,
  temperatureLabel,
} from "./ResortWeather";

const API = "http://api";
const ID = weather.resort_id;

function shown(fetchFn: jest.Mock) {
  return <ResortWeather resortId={ID} apiUrl={API} fetchFn={fetchFn} apiKey={null} />;
}

test("altitudes, degrees and snow, in metres or with miles in feet", () => {
  expect(grouped(1200)).toBe("1,200");
  expect(grouped(950)).toBe("950");
  expect(altitudeLabel(2500, "km")).toBe("2,500 m");
  expect(altitudeLabel(2500, "mi")).toBe("8,202 ft");
  expect(temperatureLabel(-3.4, "km")).toBe("−3°");
  expect(temperatureLabel(0.2, "km")).toBe("0°");
  expect(temperatureLabel(-5, "mi")).toBe("23°");
  expect(snowLabel(4.5, "km")).toBe("4.5 cm");
  expect(snowLabel(5.08, "mi")).toBe("2.0 in");
});

test("MET Norway's symbols as signs, day or night", () => {
  expect(symbolSign("heavysnowshowers_day")).toBe("❄️");
  expect(symbolSign("clearsky_night")).toBe("🌙");
  expect(symbolSign("clearsky_day")).toBe("☀️");
  expect(symbolSign("partlycloudy_night")).toBe("⛅");
  expect(symbolSign("lightrainandthunder")).toBe("⛈");
  expect(symbolSign(null)).toBe("");
  expect(symbolSign("something_new")).toBe("");
});

test("the row of the day shows one hour in three", () => {
  const hours = shownHours(weather.base.hours);
  expect(hours).toHaveLength(Math.ceil(24 / HOUR_STEP));
  expect(hours[1]).toBe(weather.base.hours[HOUR_STEP]);
});

test("the base and the top, each with its altitude and the snow expected", async () => {
  const fetchFn = answers({ status: 200, body: weather });
  await render(shown(fetchFn));
  expect(await screen.findByText("Base · 1,200 m")).toBeOnTheScreen();
  expect(screen.getByText("Top · 2,500 m")).toBeOnTheScreen();
  expect(screen.getByTestId("weather-base-snow")).toHaveTextContent("0.8 cm");
  expect(screen.getByTestId("weather-top-snow")).toHaveTextContent("4.5 cm");
  expect(screen.getAllByTestId("weather-hour")).toHaveLength(2 * (24 / HOUR_STEP));
  expect(
    screen.getByText("Estimated from the forecast, not a snow report."),
  ).toBeOnTheScreen();
  expect(screen.queryByTestId("weather-stale")).toBeNull();
  expect(fetchFn.mock.calls[0][0]).toBe(`${API}/ski-resorts/${ID}/weather`);
});

test("one altitude only, and an older forecast said as such", async () => {
  const fetchFn = answers({
    status: 200,
    body: { ...weather, stale: true, top: null },
  });
  await render(shown(fetchFn));
  expect(await screen.findByTestId("weather-stale")).toHaveTextContent(
    "Older forecast: MET Norway is not answering.",
  );
  expect(screen.queryByTestId("weather-top")).toBeNull();
});

test("no weather from the API says it is not there now", async () => {
  const fetchFn = answers({ status: 503, body: apiError("http_503") });
  await render(shown(fetchFn));
  expect(await screen.findByText("Weather unavailable right now.")).toBeOnTheScreen();
});
