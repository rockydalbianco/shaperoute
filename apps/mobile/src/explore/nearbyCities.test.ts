import {
  fetchNearbyCities,
  forgetNearby,
  knownNearby,
  MAX_NEARBY,
  nearbyKey,
} from "./nearbyCities";

const API = "http://api.test";
const CALDONAZZO: [number, number] = [46.0036, 11.2647];
const levico = {
  label: "Levico Terme, Trentino – Alto Adige/Südtirol, Italy",
  point: [46.0091259, 11.3017774],
  away_m: 2929,
};
const pergine = {
  label: "Pergine Valsugana, Trentino – Alto Adige/Südtirol, Italy",
  point: [46.0605291, 11.2406747],
  away_m: 6594,
};

beforeEach(forgetNearby);

function answering(body: unknown, status = 200): jest.Mock {
  return jest.fn(() => Promise.resolve(Response.json(body, { status })));
}

test("the towns near the start, with the key and no position kept twice", async () => {
  const fetchFn = answering({ places: [levico, pergine] });
  const towns = await fetchNearbyCities(API, CALDONAZZO, { fetchFn, key: "K" });
  expect(towns).toEqual([levico, pergine]);
  expect(fetchFn).toHaveBeenCalledWith(
    `${API}/nearby-cities?lat=46.0036&lon=11.2647`,
    expect.objectContaining({ headers: { "X-API-Key": "K" } }),
  );
  // The same square again, a few metres away: nothing is asked.
  expect(await fetchNearbyCities(API, [46.0012, 11.2629], { fetchFn })).toEqual(towns);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(knownNearby(API, CALDONAZZO)).toEqual(towns);
});

test("another square, or another API, asks again", async () => {
  const fetchFn = answering({ places: [levico] });
  await fetchNearbyCities(API, CALDONAZZO, { fetchFn });
  await fetchNearbyCities(API, [46.0679, 11.1211], { fetchFn });
  await fetchNearbyCities("http://other.test", CALDONAZZO, { fetchFn });
  expect(fetchFn).toHaveBeenCalledTimes(3);
  expect(nearbyKey(API, CALDONAZZO)).toBe(`${API} 46.00,11.26`);
});

test("four at most, and what does not read is left out", async () => {
  const many = Array.from({ length: 6 }, (_, i) => ({ ...levico, label: `Town ${i}` }));
  const broken = [
    null,
    { label: "No point", away_m: 10 },
    { label: "", point: [46, 11], away_m: 10 },
    { label: "No distance", point: [46, 11] },
    { label: "Three numbers", point: [46, 11, 0], away_m: 10 },
  ];
  const fetchFn = answering({ places: [...broken, ...many] });
  const towns = await fetchNearbyCities(API, CALDONAZZO, { fetchFn });
  expect(towns?.map((town) => town.label)).toEqual(
    Array.from({ length: MAX_NEARBY }, (_, i) => `Town ${i}`),
  );
});

test("no towns around is an answer, and is kept", async () => {
  const fetchFn = answering({ places: [] });
  expect(await fetchNearbyCities(API, CALDONAZZO, { fetchFn })).toEqual([]);
  expect(knownNearby(API, CALDONAZZO)).toEqual([]);
});

test("an API that does not answer is null, and is asked again", async () => {
  const off = answering({ error: { code: "unavailable", message: "off" } }, 503);
  expect(await fetchNearbyCities(API, CALDONAZZO, { fetchFn: off })).toBeNull();
  const odd = answering({ routes: [] });
  expect(await fetchNearbyCities(API, CALDONAZZO, { fetchFn: odd })).toBeNull();
  const down = jest.fn(() => Promise.reject(new Error("no network")));
  expect(await fetchNearbyCities(API, CALDONAZZO, { fetchFn: down })).toBeNull();
  expect(knownNearby(API, CALDONAZZO)).toBeNull();
  const fetchFn = answering({ places: [levico] });
  expect(await fetchNearbyCities(API, CALDONAZZO, { fetchFn })).toEqual([levico]);
});
