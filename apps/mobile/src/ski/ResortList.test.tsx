import resorts from "@shaperoute/shared-types/fixtures/ski-resorts.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import type { PositionState } from "../location/useCurrentPosition";
import { SEARCH_DELAY_MS } from "../search/useDrawingSearch";
import { nameOf, ResortList } from "./ResortList";

const API = "http://api";
const HERE: PositionState = { status: "ok", point: [46.381234, 11.523456] };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(SEARCH_DELAY_MS);
  });
}

function list(
  typed: string,
  fetchFn: jest.Mock,
  locate: () => Promise<PositionState> = async () => HERE,
  onPick = jest.fn(),
) {
  return (
    <ResortList
      typed={typed}
      apiUrl={API}
      onPick={onPick}
      fetchFn={fetchFn}
      apiKey={null}
      locate={locate}
    />
  );
}

test("a name is asked from two letters; fewer ask the nearest", () => {
  expect(nameOf(" a ")).toBeNull();
  expect(nameOf(" Al ")).toBe("Al");
});

test("with nothing typed, the resorts near the phone, nearest first", async () => {
  const fetchFn = answers({ status: 200, body: resorts });
  await render(list("", fetchFn));
  await settle();
  expect(screen.getByText("Near you")).toBeOnTheScreen();
  expect(fetchFn.mock.calls[0][0]).toBe(`${API}/ski-resorts?lat=46.38&lon=11.52`);
  expect(screen.getByText("Alpe Bianca")).toBeOnTheScreen();
  expect(screen.getByText("Trentino-Alto Adige · 3.4 km")).toBeOnTheScreen();
  // No region: how far it is alone.
  expect(screen.getByText("12.8 km")).toBeOnTheScreen();
});

test("a name typed asks the resorts by name, once the typing pauses", async () => {
  const fetchFn = answers(
    { status: 200, body: resorts },
    { status: 200, body: resorts },
  );
  const { rerender } = await render(list("", fetchFn));
  await settle();
  await rerender(list("Alpe", fetchFn));
  expect(fetchFn).toHaveBeenCalledTimes(1);
  await settle();
  expect(fetchFn.mock.calls[1][0]).toBe(`${API}/ski-resorts?q=Alpe`);
  expect(screen.getByText("Ski resorts")).toBeOnTheScreen();
});

test("a name that finds nothing says so", async () => {
  const fetchFn = answers({ status: 200, body: { resorts: [] } });
  await render(list("Nowhere", fetchFn));
  await settle();
  expect(screen.getByText("No ski resort with this name.")).toBeOnTheScreen();
});

test("without the position, nothing is asked until a name is typed", async () => {
  const fetchFn = answers({ status: 200, body: resorts });
  await render(list("", fetchFn, async () => ({ status: "denied" })));
  await settle();
  expect(screen.getByText("Location is off")).toBeOnTheScreen();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("a resort touched is picked", async () => {
  const fetchFn = answers({ status: 200, body: resorts });
  const onPick = jest.fn();
  await render(list("", fetchFn, async () => HERE, onPick));
  await settle();
  await fireEvent.press(screen.getByTestId(`resort-${resorts.resorts[0].id}`));
  expect(onPick).toHaveBeenCalledWith(resorts.resorts[0]);
});

test("an API that fails says why", async () => {
  const fetchFn = answers({ status: 500, body: apiError("internal") });
  await render(list("Alpe", fetchFn));
  await settle();
  expect(screen.queryByText("Alpe Bianca")).toBeNull();
  expect(screen.getByText(/Something went wrong on our side/)).toBeOnTheScreen();
});
