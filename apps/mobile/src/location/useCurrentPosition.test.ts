import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";

import {
  POSITION_TIMEOUT_MS,
  readPosition,
  useCurrentPosition,
} from "./useCurrentPosition";

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  PermissionStatus: { GRANTED: "granted", DENIED: "denied" },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const requestPermission = jest.mocked(Location.requestForegroundPermissionsAsync);
const getPosition = jest.mocked(Location.getCurrentPositionAsync);

function permission(granted: boolean) {
  return {
    granted,
    status: granted
      ? Location.PermissionStatus.GRANTED
      : Location.PermissionStatus.DENIED,
    canAskAgain: true,
    expires: "never" as const,
  };
}

function positionAt(latitude: number, longitude: number) {
  return {
    coords: {
      latitude,
      longitude,
      altitude: null,
      accuracy: 20,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 0,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

test("granted: the point comes as (lat, lon)", async () => {
  requestPermission.mockResolvedValue(permission(true));
  getPosition.mockResolvedValue(positionAt(46.0671, 11.1214));
  await expect(readPosition()).resolves.toEqual({
    status: "ok",
    point: [46.0671, 11.1214],
  });
});

test("denied: the position is not even asked for", async () => {
  requestPermission.mockResolvedValue(permission(false));
  await expect(readPosition()).resolves.toEqual({ status: "denied" });
  expect(getPosition).not.toHaveBeenCalled();
});

test("an error from the GPS gives unavailable", async () => {
  requestPermission.mockResolvedValue(permission(true));
  getPosition.mockRejectedValue(new Error("Location services are disabled"));
  await expect(readPosition()).resolves.toEqual({ status: "unavailable" });
});

test("a GPS that never answers gives unavailable", async () => {
  jest.useFakeTimers();
  requestPermission.mockResolvedValue(permission(true));
  getPosition.mockReturnValue(new Promise(() => {}));
  const result = readPosition();
  await jest.advanceTimersByTimeAsync(POSITION_TIMEOUT_MS);
  await expect(result).resolves.toEqual({ status: "unavailable" });
  jest.useRealTimers();
});

test("the hook reads on start and again on refresh", async () => {
  requestPermission.mockResolvedValue(permission(true));
  getPosition.mockResolvedValue(positionAt(46.0671, 11.1214));
  const { result } = await renderHook(() => useCurrentPosition());
  await waitFor(() =>
    expect(result.current.position).toEqual({
      status: "ok",
      point: [46.0671, 11.1214],
    }),
  );

  getPosition.mockResolvedValue(positionAt(46.0122, 11.2986));
  await act(() => result.current.refresh());
  await waitFor(() =>
    expect(result.current.position).toEqual({
      status: "ok",
      point: [46.0122, 11.2986],
    }),
  );
  expect(getPosition).toHaveBeenCalledTimes(2);
});
