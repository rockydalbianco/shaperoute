import { createDownloadResumable } from "expo-file-system/legacy";

import { files } from "./memoryFiles";
import { phoneId, prefetchPausedUntil } from "./prefetch";
import {
  coveringZone,
  deleteZones,
  type Download,
  downloadTelling,
  downloadZone,
  fileNameOf,
  overLimit,
  savedBytes,
  savedZones,
  SPACE_LIMIT_BYTES,
  touchZone,
  watchZones,
  zoneArea,
  type ZoneEntry,
  zoneUri,
} from "./zones";

jest.mock("expo-file-system", () => jest.requireActual("./memoryFiles"));
jest.mock("expo-file-system/legacy", () => ({ createDownloadResumable: jest.fn() }));

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
    undefined,
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

test("the size the server sends is told once, as the first bytes arrive", async () => {
  const result = { uri: "file:///x", status: 200, headers: {}, mimeType: null };
  jest.mocked(createDownloadResumable).mockImplementation(
    (_url, _fileUri, _options, callback) =>
      ({
        downloadAsync: async () => {
          for (const written of [100, 5_000, 7_000_000]) {
            callback?.({
              totalBytesWritten: written,
              totalBytesExpectedToWrite: 7_000_000,
            });
          }
          return result;
        },
      }) as unknown as ReturnType<typeof createDownloadResumable>,
  );
  const onSize = jest.fn();
  expect(await downloadTelling("https://api/x", "file:///x", {}, onSize)).toBe(result);
  expect(onSize.mock.calls).toEqual([[7_000_000]]);
});

test("without Content-Length, no size is told", async () => {
  jest.mocked(createDownloadResumable).mockImplementation(
    (_url, _fileUri, _options, callback) =>
      ({
        downloadAsync: async () => {
          callback?.({ totalBytesWritten: 100, totalBytesExpectedToWrite: -1 });
          return undefined;
        },
      }) as unknown as ReturnType<typeof createDownloadResumable>,
  );
  const onSize = jest.fn();
  expect(
    await downloadTelling("https://api/x", "file:///x", {}, onSize),
  ).toBeUndefined();
  expect(onSize).not.toHaveBeenCalled();
});

test("the size goes to the download, and a download cut short saves nothing", async () => {
  const onSize = jest.fn();
  const download = jest.fn(async (..._args: Parameters<Download>) => undefined);
  const answer = await downloadZone(URL_BASE, "foot", HERE, {
    apiKey: null,
    download,
    onSize,
  });
  expect(download.mock.calls[0][3]).toBe(onSize);
  expect(answer).toEqual({ kind: "failed", why: "the download stopped" });
  expect(savedZones()).toEqual([]);
});

test("a watcher hears each change of the zones, until it stops", async () => {
  const watcher = jest.fn();
  const stop = watchZones(watcher);
  await downloadZone(URL_BASE, "foot", HERE, {
    apiKey: null,
    download: answering(200, zipHeaders(TRENTO), "0123456789"),
  });
  expect(watcher).toHaveBeenCalledTimes(1);
  expect(savedBytes()).toBe(10);
  deleteZones();
  expect(watcher).toHaveBeenCalledTimes(2);
  expect(savedBytes()).toBe(0);
  stop();
  touchZone(TRENTO);
  expect(watcher).toHaveBeenCalledTimes(2);
});

test("the space of the zones is the sum of their sizes", () => {
  expect(savedBytes([entry(TRENTO, 7), entry(TRENTO_BIKE, 12)])).toBe(19);
  expect(savedBytes([])).toBe(0);
});

test("a zone ahead says so, with the phone's id; the zone around it does not", async () => {
  const download = answering(200, zipHeaders(TRENTO));
  await downloadZone(URL_BASE, "foot", HERE, { apiKey: "k", download });
  await downloadZone(URL_BASE, "foot", [45.4642, 9.19], {
    apiKey: "k",
    download,
    prefetch: true,
  });
  const [around, ahead] = download.mock.calls;
  expect(around[0]).toBe(`${URL_BASE}/phone-zones/foot?lat=46.0679&lon=11.1211`);
  expect(around[2]).toEqual({ headers: { "X-API-Key": "k" } });
  expect(ahead[0]).toBe(`${URL_BASE}/phone-zones/foot?lat=45.4642&lon=9.19&prefetch=1`);
  expect(ahead[2]).toEqual({
    headers: { "X-API-Key": "k", "X-Phone-Id": phoneId() },
  });
});

test("past the day's cap, no zone ahead is asked before Retry-After", async () => {
  const refused = answering(429, { "Retry-After": "21600" }, '{"error":{}}');
  const at = (now: number) => ({ apiKey: null, now: () => now, prefetch: true });
  expect(
    await downloadZone(URL_BASE, "bike", HERE, { ...at(1_000), download: refused }),
  ).toEqual({ kind: "later", retryAt: 1_000 + 21_600_000 });
  expect(prefetchPausedUntil()).toBe(1_000 + 21_600_000);
  expect(savedZones()).toEqual([]);
  expect([...files.keys()].some((uri) => uri.includes(".download"))).toBe(false);

  const saved = answering(200, zipHeaders(TRENTO_BIKE));
  expect(
    await downloadZone(URL_BASE, "bike", HERE, { ...at(21_600_999), download: saved }),
  ).toEqual({ kind: "later", retryAt: 21_601_000 });
  expect(saved).not.toHaveBeenCalled();
  // The zone around the phone is never held back.
  await downloadZone(URL_BASE, "bike", HERE, { apiKey: null, download: saved });
  expect(saved).toHaveBeenCalledTimes(1);

  files.delete(`file:///documents/engine/zones/${TRENTO_BIKE}`);
  expect(
    await downloadZone(URL_BASE, "bike", HERE, { ...at(21_601_000), download: saved }),
  ).toMatchObject({ kind: "saved" });
});

test("a 429 for the zone around the phone is a failure, not a pause", async () => {
  expect(
    await downloadZone(URL_BASE, "foot", HERE, {
      apiKey: null,
      download: answering(429, { "Retry-After": "60" }),
    }),
  ).toEqual({ kind: "failed", why: "the server answered 429" });
  expect(prefetchPausedUntil()).toBe(0);
});
