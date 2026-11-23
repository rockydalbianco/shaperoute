/**
 * Where the phone points on «Compass» (TASK-431, ADR-0359): the map is
 * told each new whole degree, standing still too, and once that it is over.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { MapView } from "./MapView";

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const HERE: LatLon = [46.001, 11.001];

function pagePosts(data: string) {
  return fireEvent(screen.getByTestId("map"), "message", { nativeEvent: { data } });
}

/** The headings told to the page with «face», in order. */
function faced(): (number | null)[] {
  return injectJavaScript.mock.calls
    .map(([script]: [string]) => /receive\((.*)\); true;$/.exec(script)?.[1])
    .filter((json: string | undefined): json is string => json !== undefined)
    .map(
      (json: string) => JSON.parse(json) as { type: string; heading?: number | null },
    )
    .filter((message: { type: string }) => message.type === "face")
    .map((message: { heading?: number | null }) => message.heading ?? null);
}

beforeEach(() => {
  injectJavaScript.mockClear();
});

test("a map off Compass is never told where the phone points", async () => {
  const onError = jest.fn();
  const { rerender } = await render(
    <MapView start={null} route={null} following={HERE} onError={onError} />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(
    <MapView
      start={null}
      route={null}
      following={HERE}
      heading={30}
      onError={onError}
    />,
  );
  expect(faced()).toEqual([]);
});

test("each new whole degree is told, the same one not twice, then null once", async () => {
  const onError = jest.fn();
  const at = (facing: number | null) => (
    <MapView
      start={null}
      route={null}
      following={HERE}
      facing={facing}
      onError={onError}
    />
  );
  const { rerender } = await render(at(90.2));
  await pagePosts('{"type":"ready"}');
  await rerender(at(90.4));
  await rerender(at(181.6));
  await rerender(at(null));
  await rerender(at(null));
  expect(faced()).toEqual([90, 182, null]);
});

test("nothing is told before the page is ready", async () => {
  await render(
    <MapView
      start={null}
      route={null}
      following={HERE}
      facing={45}
      onError={jest.fn()}
    />,
  );
  expect(faced()).toEqual([]);
  await pagePosts('{"type":"ready"}');
  expect(faced()).toEqual([45]);
});
