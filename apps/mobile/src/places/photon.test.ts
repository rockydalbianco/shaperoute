import response from "./fixtures/photon-via-belenzani-trento.json";
import {
  parsePhotonResponse,
  photonSearchUrl,
  placeLabel,
  searchPlaces,
} from "./photon";

// A real answer to "Via Belenzani, Trento" (2026-09-23), trimmed to the
// properties that matter: the street comes back twice, once per OSM way.
const EXPECTED = [
  { label: "Via Rodolfo Belenzani, Trento", point: [46.0692621, 11.1211947] },
  {
    label: "Scuola Primaria «Rodolfo Belenzani», Trento",
    point: [46.0741262, 11.1394085],
  },
  { label: "Comune di Trento, Trento", point: [46.0692814, 11.1213339] },
];

function answer(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status === 200,
    status,
    json: () => Promise.resolve(body),
  });
}

test("the URL carries the trimmed, encoded text and the limit", () => {
  expect(photonSearchUrl("  Via Belenzani, Trento ")).toBe(
    "https://photon.komoot.io/api/?q=Via%20Belenzani%2C%20Trento&limit=5",
  );
});

test("reads the answer into labels and (lat, lon) points, without repeats", () => {
  expect(parsePhotonResponse(response)).toEqual(EXPECTED);
});

test("an empty or malformed answer gives no places", () => {
  expect(parsePhotonResponse({ type: "FeatureCollection", features: [] })).toEqual([]);
  expect(parsePhotonResponse(null)).toEqual([]);
  expect(
    parsePhotonResponse({ features: [{ properties: { name: "No point" } }] }),
  ).toEqual([]);
});

test.each([
  [
    { name: "Levico Terme", county: "Provincia di Trento", country: "Italia" },
    "Levico Terme, Provincia di Trento",
  ],
  [
    { name: "Trento", city: "Trento", county: "Provincia di Trento" },
    "Trento, Provincia di Trento",
  ],
  [
    { street: "Via San Vito", housenumber: "169", city: "Trento" },
    "Via San Vito 169, Trento",
  ],
  [{ name: "Italia" }, "Italia"],
  [{ city: "Trento" }, null],
])("placeLabel(%j) is %j", (properties, expected) => {
  expect(placeLabel(properties)).toBe(expected);
});

test("searchPlaces asks Photon and reads the answer", async () => {
  const fetchFn = answer(200, response);
  await expect(searchPlaces("Via Belenzani, Trento", fetchFn)).resolves.toEqual(
    EXPECTED,
  );
  expect(fetchFn).toHaveBeenCalledWith(photonSearchUrl("Via Belenzani, Trento"));
});

test("searchPlaces fails when Photon does not answer 200", async () => {
  await expect(searchPlaces("Trento", answer(503, {}))).rejects.toThrow("503");
});

test("searchPlaces fails when the network does", async () => {
  const fetchFn = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
  await expect(searchPlaces("Trento", fetchFn)).rejects.toThrow(
    "Network request failed",
  );
});
