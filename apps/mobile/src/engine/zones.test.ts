import { files } from "./memoryFiles";
import {
  coveringZone,
  deleteZones,
  downloadZone,
  fileNameOf,
  overLimit,
  savedZones,
  SPACE_LIMIT_BYTES,
  touchZone,
  zoneArea,
  type ZoneEntry,
  zoneUri,
} from "./zones";

jest.mock("expo-file-system", () => jest.requireActual("./memoryFiles"));
jest.mock("expo-file-system/legacy", () => ({ downloadAsync: jest.fn() }));

const TRENTO = "foot_45.98370_11.00140_46.15030_11.24160.zone.json.gz";
const TRENTO_BIKE = "bike_45.98280_10.99990_46.15140_11.24290.zone.json.gz";
// Inside Trento's zone, smaller: the one to pick for a start in both.
const CENTRE = "foot_46.05000_11.10000_46.09000_11.14000.zone.json.gz";
const HERE: [number, number] = [46.0679, 11.1211];
const URL_BASE = "https://api.example";

function entry(name: string, bytes = 10, usedAt = 0): ZoneEntry {
  return { name, etag: null, bytes, usedAt };
}

/** A downloadAsync that writes `body` and answers `status` and `headers`. */
function answering(
  status: number,
  headers: Record<string, string> = {},
  body = "zone",
) {
  return jest.fn(async (_url: string, fileUri: string, _options?: object) => {
    files.set(fileUri, body);
    return { uri: fileUri, status, headers, mimeType: null };
  });
}

function zipHeaders(name: string, etag = '"1-2"') {
  return { "Content-Disposition": `attachment; filename="${name}"`, ETag: etag };
}

beforeEach(() => {
  files.clear();
});

test("a zone's name gives its network and area, as the API writes it", () => {
  expect(zoneArea(TRENTO)).toEqual({
    network: "foot",
    south: 45.9837,
    west: 11.0014,
    north: 46.1503,
    east: 11.2416,
  });
  expect(zoneArea("foot_1_2_3_4.zone.json.gz")).toBeNull();
  expect(
    zoneArea("../foot_45.98370_11.00140_46.15030_11.24160.zone.json.gz"),
  ).toBeNull();
  expect(zoneArea("water_45.98370_11.00140_46.15030_11.24160.zone.json.gz")).toBeNull();
  expect(
    zoneArea("foot_-33.94640_151.11610_-33.79330_151.30040.zone.json.gz"),
  ).not.toBeNull();
});

test("the zone for a start is the smallest of its network that holds it", () => {
  const zones = [entry(TRENTO), entry(CENTRE), entry(TRENTO_BIKE)];
  expect(coveringZone(zones, "foot", HERE)?.name).toBe(CENTRE);
  expect(coveringZone(zones, "foot", [46.0, 11.05])?.name).toBe(TRENTO);
  expect(coveringZone(zones, "bike", HERE)?.name).toBe(TRENTO_BIKE);
  expect(coveringZone(zones, "foot", [45.4642, 9.19])).toBeNull();
});

test("beyond the limit, the zones used longest ago go first, never the new one", () => {
  const zones = [
    entry("a", 5, 3),
    entry("b", 5, 1),
    entry("c", 5, 2),
    entry("new", 5, 0),
  ];
  expect(overLimit(zones, 20)).toEqual([]);
  expect(overLimit(zones, 15, "new").map((zone) => zone.name)).toEqual(["b"]);
  expect(overLimit(zones, 10, "new").map((zone) => zone.name)).toEqual(["b", "c"]);
  expect(overLimit(zones, 4, "new").map((zone) => zone.name)).toEqual(["b", "c", "a"]);
  expect(SPACE_LIMIT_BYTES).toBe(2_000_000_000);
});

test("the file name comes from Content-Disposition, only when it is a zone's", () => {
  expect(fileNameOf(`attachment; filename="${TRENTO}"`)).toBe(TRENTO);
  expect(fileNameOf(`attachment; filename=${TRENTO}`)).toBe(TRENTO);
  expect(fileNameOf('attachment; filename="../../etc/passwd"')).toBeNull();
  expect(fileNameOf(null)).toBeNull();
});

test("a downloaded zone is saved under the API's name, with its ETag", async () => {
  const download = answering(200, zipHeaders(TRENTO), "0123456789");
  const answer = await downloadZone(URL_BASE, "foot", HERE, {
    apiKey: "key",
    now: () => 1000,
    download,
  });
  expect(download).toHaveBeenCalledWith(
    `${URL_BASE}/phone-zones/foot?lat=46.0679&lon=11.1211`,
    expect.stringContaining(".foot.download"),
    { headers: { "X-API-Key": "key" } },
  );
  expect(answer).toEqual({
    kind: "saved",
    zone: { name: TRENTO, etag: '"1-2"', bytes: 10, usedAt: 1000 },
  });
  expect(savedZones()).toEqual([answer.kind === "saved" && answer.zone]);
  expect(files.get(zoneUri(savedZones()[0]))).toBe("0123456789");
  expect([...files.keys()].some((uri) => uri.endsWith(".download"))).toBe(false);
});

test("a zone the phone has is asked with its ETag, and a 304 keeps it", async () => {
  await downloadZone(URL_BASE, "foot", HERE, {
    apiKey: null,
    now: () => 1000,
    download: answering(200, zipHeaders(TRENTO)),
  });
  const again = answering(304);
  const answer = await downloadZone(URL_BASE, "foot", HERE, {
    apiKey: null,
    now: () => 2000,
    download: again,
  });
  expect(again.mock.calls[0][2]).toEqual({ headers: { "If-None-Match": '"1-2"' } });
  expect(answer).toMatchObject({ kind: "unchanged", zone: { name: TRENTO } });
  expect(savedZones()[0].usedAt).toBe(2000);
});

test("no zone on the server, or a refusal, saves nothing", async () => {
  expect(
    await downloadZone(URL_BASE, "foot", HERE, {
      apiKey: null,
      download: answering(404),
    }),
  ).toEqual({ kind: "none" });
  expect(
    await downloadZone(URL_BASE, "foot", HERE, {
      apiKey: null,
      download: answering(401),
    }),
  ).toEqual({ kind: "failed", why: "the server answered 401" });
  expect(savedZones()).toEqual([]);
  expect(files.size).toBe(0);
});

test("a file that is not a zone of the network asked is not kept", async () => {
  const answer = await downloadZone(URL_BASE, "foot", HERE, {
    apiKey: null,
    download: answering(200, zipHeaders(TRENTO_BIKE)),
  });
  expect(answer).toMatchObject({ kind: "failed" });
  expect(savedZones()).toEqual([]);
});

test("no network: the download fails quietly", async () => {
  const answer = await downloadZone(URL_BASE, "foot", HERE, {
    apiKey: null,
    download: jest.fn().mockRejectedValue(new Error("offline")),
  });
  expect(answer).toEqual({ kind: "failed", why: "Error: offline" });
});

test("a zone used by a route moves to the back of the deletion line", async () => {
  await downloadZone(URL_BASE, "foot", HERE, {
    apiKey: null,
    now: () => 1,
    download: answering(200, zipHeaders(TRENTO)),
  });
  touchZone(TRENTO, 50);
  expect(savedZones()[0].usedAt).toBe(50);
});

test("«Delete» removes every zone and the index", async () => {
  await downloadZone(URL_BASE, "foot", HERE, {
    apiKey: null,
    download: answering(200, zipHeaders(TRENTO)),
  });
  deleteZones();
  expect(savedZones()).toEqual([]);
  expect([...files.keys()].filter((uri) => uri.endsWith(".gz"))).toEqual([]);
});

test("an index that does not read, or names a missing file, gives no zone", () => {
  files.set("file:///documents/engine/zones.json", "not json");
  expect(savedZones()).toEqual([]);
  files.set(
    "file:///documents/engine/zones.json",
    JSON.stringify({ zones: [entry(TRENTO)] }),
  );
  expect(savedZones()).toEqual([]);
});
