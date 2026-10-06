import type { LatLon } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { MapView } from "./MapView";

// A map that could not load can be loaded again (TASK-256): «Retry» on the
// map, or the app back in front; once it loads, the error goes away.

jest.mock("react-native-webview");
const { reload } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const TRENTO: LatLon = [46.0671, 11.1214];
const WORDS = "The map could not be loaded. Check the network.";

function pagePosts(data: string) {
  return fireEvent(screen.getByTestId("map"), "message", { nativeEvent: { data } });
}

beforeEach(() => reload.mockClear());

test("a map that cannot load says so and offers «Retry», which loads the page again", async () => {
  const onError = jest.fn();
  await render(<MapView start={TRENTO} route={null} onError={onError} />);
  expect(screen.queryByText(WORDS)).toBeNull();

  await pagePosts('{"type":"error","message":"MapLibre GL JS did not load"}');
  expect(onError).toHaveBeenCalledWith("MapLibre GL JS did not load");
  expect(screen.getByText(WORDS)).toBeTruthy();
  expect(screen.queryByTestId("map-loading")).toBeNull();

  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(reload).toHaveBeenCalledTimes(1);
  // While the page loads again, the bar; the words only if it fails again.
  expect(screen.queryByText(WORDS)).toBeNull();
  expect(screen.getByTestId("map-loading")).toBeTruthy();
});

test("once the map loads, the words go and the screen is told there is no error", async () => {
  const onError = jest.fn();
  await render(<MapView start={TRENTO} route={null} onError={onError} />);
  await pagePosts('{"type":"error","message":"style not found"}');
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  await pagePosts('{"type":"ready"}');
  await pagePosts('{"type":"loaded"}');
  expect(screen.queryByText(WORDS)).toBeNull();
  expect(screen.queryByTestId("map-loading")).toBeNull();
  expect(onError).toHaveBeenLastCalledWith(null);
  expect(onError).toHaveBeenCalledTimes(2);
});

test("a map that loads first time never says there is no error", async () => {
  const onError = jest.fn();
  await render(<MapView start={TRENTO} route={null} onError={onError} />);
  await pagePosts('{"type":"ready"}');
  await pagePosts('{"type":"loaded"}');
  expect(onError).not.toHaveBeenCalled();
});

test("a page that fails again after «Retry» says so again", async () => {
  const onError = jest.fn();
  await render(<MapView start={TRENTO} route={null} onError={onError} />);
  await pagePosts('{"type":"error","message":"style not found"}');
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  await pagePosts('{"type":"error","message":"style not found"}');
  expect(screen.getByText(WORDS)).toBeTruthy();
  expect(onError).toHaveBeenCalledTimes(2);
});

test("the app back in front loads a failed map again, and only a failed one", async () => {
  let appState: (next: AppStateStatus) => void = () => {};
  const remove = jest.fn();
  const listen = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_type, listener) => {
      appState = listener;
      return { remove } as ReturnType<typeof AppState.addEventListener>;
    });
  try {
    await render(<MapView start={TRENTO} route={null} onError={jest.fn()} />);
    // Nothing of the map's watched while it is fine (the pocket mode has
    // its own listener).
    const before = listen.mock.calls.length;

    await pagePosts('{"type":"error","message":"style not found"}');
    expect(listen).toHaveBeenCalledTimes(before + 1);
    await act(() => appState("background"));
    expect(reload).not.toHaveBeenCalled();
    await act(() => appState("active"));
    expect(reload).toHaveBeenCalledTimes(1);
    // The map loads again: no longer watched.
    await pagePosts('{"type":"loaded"}');
    expect(remove).toHaveBeenCalled();
  } finally {
    listen.mockRestore();
  }
});
