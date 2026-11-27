import { answers, apiError } from "../account/testing";
import { fetchWinds, isWinds } from "./winds";

const URL = "http://api";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

// Made-up winds, in the form of GET /winds.
const WINDS = {
  source: "icon-d2",
  run: "2026-11-26T06:00:00Z",
  attribution: "DWD ICON-D2, CC BY 4.0",
  lat: 45.74,
  lon: 10.84,
  levels: [850, 700, 600, 500],
  hours: [
    {
      time: "2026-11-26T07:00:00Z",
      winds: [
        { hpa: 850, speed_ms: null, from_deg: null },
        { hpa: 700, speed_ms: 5, from_deg: 217 },
        { hpa: 600, speed_ms: 7.5, from_deg: 230 },
        { hpa: 500, speed_ms: 12, from_deg: 250 },
      ],
    },
  ],
};

test("the winds of the API are what the app reads", () => {
  expect(isWinds(WINDS)).toBe(true);
  expect(isWinds({ ...WINDS, hours: [] })).toBe(true);
  expect(isWinds({ ...WINDS, hours: [{ ...WINDS.hours[0], time: "soon" }] })).toBe(
    false,
  );
  expect(isWinds({ ...WINDS, levels: ["850"] })).toBe(false);
  expect(isWinds(null)).toBe(false);
});

test("the place goes rounded to about a kilometre, without a token", async () => {
  const fetchFn = answers({ status: 200, body: WINDS });
  expect(await fetchWinds(URL, [45.73456, 10.83789], options(fetchFn))).toEqual({
    kind: "ok",
    value: WINDS,
  });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/winds?lat=45.73&lon=10.84");
  expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
});

test("no fresh run is an error, not a calm", async () => {
  const fetchFn = answers({ status: 503, body: apiError("http_503") });
  expect((await fetchWinds(URL, [45.7, 10.8], options(fetchFn))).kind).toBe(
    "api_error",
  );
});
