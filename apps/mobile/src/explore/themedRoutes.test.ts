import done from "@shaperoute/shared-types/fixtures/themed-route-job-done.json";
import failed from "@shaperoute/shared-types/fixtures/themed-route-job-failed.json";
import places from "@shaperoute/shared-types/fixtures/places.json";

import { searchCities } from "./cities";
import { getThemed, isThemedJob, postThemed } from "./themedRoutes";

test("the API's job bodies pass the guard", () => {
  expect(isThemedJob(done)).toBe(true);
  expect(isThemedJob(failed)).toBe(true);
  expect(
    isThemedJob({ job_id: "x", status: "running", result: null, error: null }),
  ).toBe(true);
  expect(
    isThemedJob({ ...done, result: { ...done.result, stops: [{ name: 1 }] } }),
  ).toBe(false);
  expect(isThemedJob({ ...failed, error: null })).toBe(false);
  expect(isThemedJob({ job_id: "x", status: "lost" })).toBe(false);
});

test("posts the request and reads the job; never throws", async () => {
  const fetchFn = jest.fn().mockResolvedValue(Response.json(done, { status: 202 }));
  const request = { text: "luoghi famosi a Milano", centre: null, city: null };
  expect(await postThemed("http://api", request, { fetchFn, key: null })).toEqual(done);
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/themed-route-jobs");
  expect(JSON.parse(init.body)).toEqual(request);
  const down = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
  expect(await getThemed("http://api", "f00d", { fetchFn: down })).toBeNull();
});

test("cities come from GET /cities", async () => {
  const fetchFn = jest.fn().mockResolvedValue(Response.json(places));
  expect(await searchCities("http://api", " Milano ", { fetchFn, key: null })).toEqual(
    places.places,
  );
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/cities?q=Milano");
  expect(await searchCities("http://api", "  ", { fetchFn })).toEqual([]);
  const off = jest
    .fn()
    .mockResolvedValue(Response.json({ error: {} }, { status: 503 }));
  expect(await searchCities("http://api", "Milano", { fetchFn: off })).toBeNull();
});
