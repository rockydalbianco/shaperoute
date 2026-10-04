import { act, renderHook } from "@testing-library/react-native";

import type { PositionState } from "../location/useCurrentPosition";
import { PhoneEngine } from "./phoneEngine";
import { networksInOrder, usePhoneZones } from "./usePhoneZones";
import type { ZoneDownload } from "./zones";

jest.mock("expo-file-system", () => jest.requireActual("./memoryFiles"));
jest.mock("expo-file-system/legacy", () => ({ downloadAsync: jest.fn() }));

const HERE: PositionState = { status: "ok", point: [46.0679, 11.1211] };
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
      usePhoneZones(position, "https://api", { engine, download }),
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
  await act(async () => {
    await rerender({ position: { status: "ok", point: [45, 11] } });
  });
  expect(download).toHaveBeenCalledTimes(2);
});

test("no zone around the phone, and none saved: Python waits for a route", async () => {
  const engine = new PhoneEngine();
  const warmUp = jest.spyOn(engine, "warmUp");
  const download = jest.fn(async (): Promise<ZoneDownload> => ({ kind: "none" }));
  await act(async () => {
    await renderHook(() => usePhoneZones(HERE, "https://api", { engine, download }));
  });
  expect(download).toHaveBeenCalledTimes(2);
  expect(warmUp).not.toHaveBeenCalled();
});

test("without an API address nothing is downloaded", async () => {
  const download = jest.fn(async (): Promise<ZoneDownload> => SAVED);
  await renderHook(() => usePhoneZones(HERE, null, { download }));
  expect(download).not.toHaveBeenCalled();
});
