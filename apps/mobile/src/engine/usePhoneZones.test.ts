import { act, renderHook } from "@testing-library/react-native";

import type { PositionState } from "../location/useCurrentPosition";
import { PhoneEngine } from "./phoneEngine";
import { files } from "./memoryFiles";
import { networksInOrder, usePhoneZones } from "./usePhoneZones";
import { type downloadZone, type ZoneDownload, zoneUri } from "./zones";

jest.mock("expo-file-system", () => jest.requireActual("./memoryFiles"));
jest.mock("expo-file-system/legacy", () => ({ createDownloadResumable: jest.fn() }));

// The round of zones ahead (part B2), tested in aheadZones.test.ts.
const noAhead = jest.fn(async () => "done" as const);

beforeEach(() => {
  files.clear();
  noAhead.mockClear();
});

const HERE: PositionState = { status: "ok", point: [46.0679, 11.1211] };
const TRENTO = "foot_45.98370_11.00140_46.15030_11.24160.zone.json.gz";
const SAVED: ZoneDownload = {
  kind: "saved",
  zone: {
    name: "foot_1.00000_2.00000_3.00000_4.00000.zone.json.gz",
    etag: null,
    bytes: 1,
    usedAt: 0,
  },
};

test("the network of the chosen sport comes first", () => {
  expect(networksInOrder("foot")).toEqual(["foot", "bike"]);
  expect(networksInOrder("bike")).toEqual(["bike", "foot"]);
});

test("once the position is known, both zones are asked, once, then Python starts", async () => {
  const engine = new PhoneEngine();
  const warmUp = jest.spyOn(engine, "warmUp").mockImplementation(() => undefined);
  const download = jest.fn(async (): Promise<ZoneDownload> => SAVED);
  const { rerender } = await renderHook(
    ({ position }: { position: PositionState }) =>
      usePhoneZones(position, "https://api", { engine, download, ahead: noAhead }),
    { initialProps: { position: { status: "loading" } as PositionState } },
  );
  expect(download).not.toHaveBeenCalled();
  await act(async () => {
    await rerender({ position: HERE });
  });
  expect(download.mock.calls.map((call) => call.slice(0, 3))).toEqual([
    ["https://api", "foot", HERE.point],
    ["https://api", "bike", HERE.point],
  ]);
  expect(warmUp).toHaveBeenCalledTimes(1);
  // Then the zones ahead, on the network of the sport, as the zones around.
  expect(noAhead.mock.calls).toEqual([
    ["https://api", HERE.point, "foot", { download }],
  ]);
  await act(async () => {
    await rerender({ position: { status: "ok", point: [45, 11] } });
  });
  expect(download).toHaveBeenCalledTimes(2);
  expect(noAhead).toHaveBeenCalledTimes(1);
});

test("no zone around the phone, and none saved: Python waits for a route", async () => {
  const engine = new PhoneEngine();
  const warmUp = jest.spyOn(engine, "warmUp");
  const download = jest.fn(async (): Promise<ZoneDownload> => ({ kind: "none" }));
  await act(async () => {
    await renderHook(() =>
      usePhoneZones(HERE, "https://api", { engine, download, ahead: noAhead }),
    );
  });
  expect(download).toHaveBeenCalledTimes(2);
  expect(warmUp).not.toHaveBeenCalled();
  // A server without zones here, or one that does not answer: no city ahead.
  expect(noAhead).not.toHaveBeenCalled();
});

test("without an API address nothing is downloaded", async () => {
  const download = jest.fn(async (): Promise<ZoneDownload> => SAVED);
  await renderHook(() => usePhoneZones(HERE, null, { download, ahead: noAhead }));
  expect(download).not.toHaveBeenCalled();
  expect(noAhead).not.toHaveBeenCalled();
});

test("the first maps of the phone are told while they download, then not", async () => {
  const engine = new PhoneEngine();
  jest.spyOn(engine, "warmUp").mockImplementation(() => undefined);
  let finish: () => void = () => undefined;
  const download = jest.fn(
    (...[, network, , options]: Parameters<typeof downloadZone>) =>
      new Promise<ZoneDownload>((resolve) => {
        // An error the server sends is not a map.
        options?.onSize?.(network === "foot" ? 120 : 12_000_000);
        options?.onSize?.(network === "foot" ? 7_000_000 : 0);
        finish = () => resolve(SAVED);
      }),
  );
  const { result } = await renderHook(() =>
    usePhoneZones(HERE, "https://api", { engine, download, ahead: noAhead }),
  );
  expect(result.current).toBe(7_000_000);
  await act(async () => finish());
  // Both networks, as one size.
  expect(result.current).toBe(19_000_000);
  await act(async () => finish());
  expect(result.current).toBeNull();
});

test("with maps on the phone already, nothing is told", async () => {
  const zone = { name: TRENTO, etag: null, bytes: 7_000_000, usedAt: 0 };
  files.set("file:///documents/engine/zones.json", JSON.stringify({ zones: [zone] }));
  files.set(zoneUri(zone), "zone");
  const engine = new PhoneEngine();
  jest.spyOn(engine, "warmUp").mockImplementation(() => undefined);
  const download = jest.fn(
    async (..._args: Parameters<typeof downloadZone>): Promise<ZoneDownload> => SAVED,
  );
  const { result } = await renderHook(() =>
    usePhoneZones(HERE, "https://api", { engine, download, ahead: noAhead }),
  );
  await act(async () => undefined);
  expect(download.mock.calls.map((call) => call[3])).toEqual([{}, {}]);
  expect(result.current).toBeNull();
});

test("offline, the zone saved before starts Python, and no city ahead is asked", async () => {
  const zone = { name: TRENTO, etag: null, bytes: 7_000_000, usedAt: 0 };
  files.set("file:///documents/engine/zones.json", JSON.stringify({ zones: [zone] }));
  files.set(zoneUri(zone), "zone");
  const engine = new PhoneEngine();
  const warmUp = jest.spyOn(engine, "warmUp").mockImplementation(() => undefined);
  const download = jest.fn(async (): Promise<ZoneDownload> => ({
    kind: "failed",
    why: "offline",
  }));
  await act(async () => {
    await renderHook(() =>
      usePhoneZones(HERE, "https://api", { engine, download, ahead: noAhead }),
    );
  });
  expect(warmUp).toHaveBeenCalledTimes(1);
  expect(noAhead).not.toHaveBeenCalled();
});
