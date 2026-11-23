import weather from "@shaperoute/shared-types/fixtures/ski-resort-weather.json";
import resorts from "@shaperoute/shared-types/fixtures/ski-resorts.json";

import { answers, apiError } from "../account/testing";
import {
  fetchSkiResortWeather,
  findSkiResorts,
  isSkiResorts,
  isSkiResortWeather,
} from "./skiResorts";

const URL = "http://api";
const ID = resorts.resorts[0].id;
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

test("the examples of the API are what the app reads", () => {
  expect(isSkiResorts(resorts)).toBe(true);
  expect(isSkiResorts({ resorts: [] })).toBe(true);
  expect(isSkiResortWeather(weather)).toBe(true);
  expect(isSkiResortWeather({ ...weather, top: null })).toBe(true);
});

test("a body that is not resorts is not read", () => {
  const resort = resorts.resorts[0];
  expect(isSkiResorts(null)).toBe(false);
  expect(isSkiResorts({ resorts: [{ ...resort, id: "" }] })).toBe(false);
  expect(isSkiResorts({ resorts: [{ ...resort, bbox: [1, 2, 3] }] })).toBe(false);
  expect(isSkiResorts({ resorts: [{ ...resort, lifts: -1 }] })).toBe(false);
  expect(
    isSkiResorts({ resorts: [{ ...resort, piste_km_by_difficulty: { easy: "1" } }] }),
  ).toBe(false);
  expect(isSkiResortWeather({ ...weather, base: null })).toBe(false);
  expect(
    isSkiResortWeather({
      ...weather,
      base: { ...weather.base, hours: [{ ...weather.base.hours[0], time: "soon" }] },
    }),
  ).toBe(false);
});

test("resorts are asked by name, without a token", async () => {
  const fetchFn = answers({ status: 200, body: resorts });
  const outcome = await findSkiResorts(URL, { name: " Alpe B " }, options(fetchFn));
  expect(outcome).toEqual({ kind: "ok", value: resorts });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/ski-resorts?q=Alpe%20B");
  expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
});

test("the place sent for the nearest resorts is about a kilometre", async () => {
  const fetchFn = answers({ status: 200, body: resorts });
  await findSkiResorts(URL, { near: [46.381234, 11.523456] }, options(fetchFn));
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/ski-resorts?lat=46.38&lon=11.52");
});

test("the weather is asked by the resort's id", async () => {
  const fetchFn = answers({ status: 200, body: weather });
  expect(await fetchSkiResortWeather(URL, ID, options(fetchFn))).toEqual({
    kind: "ok",
    value: weather,
  });
  expect(fetchFn.mock.calls[0][0]).toBe(`http://api/ski-resorts/${ID}/weather`);
});

test("no weather is an error, not a forecast", async () => {
  const fetchFn = answers({ status: 503, body: apiError("http_503") });
  const outcome = await fetchSkiResortWeather(URL, ID, options(fetchFn));
  expect(outcome.kind).toBe("api_error");
});
