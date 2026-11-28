/**
 * The meeting point of an outing without a route (TASK-495 part C2, the
 * user's choice of 2026-11-28): the map opens where it is asked, the pin in
 * its middle; «Done» keeps where the middle is when the map stops.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MeetingPointMap } from "./MeetingPointMap";

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const AREA: LatLon = [46.07, 11.12];

async function shown(onDone = jest.fn(), onClose = jest.fn()) {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <MeetingPointMap from={AREA} onDone={onDone} onClose={onClose} />
    </SafeAreaProvider>,
  );
  return { onDone, onClose };
}

test("the pin stays in the middle and «Done» keeps where the map stopped", async () => {
  injectJavaScript.mockClear();
  const { onDone } = await shown();
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
  const sent = injectJavaScript.mock.calls.map(([script]: [string]) => script);
  expect(sent.some((script) => script.includes('{"type":"setPick","on":true}'))).toBe(
    true,
  );
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"centre","lngLat":[11.2,46.1]}' },
  });
  await fireEvent.press(screen.getByTestId("meeting-point-done"));
  expect(onDone).toHaveBeenCalledWith([46.1, 11.2]);
});

test("«Done» without moving keeps where it opened; «Not now» keeps nothing", async () => {
  const { onDone, onClose } = await shown();
  await fireEvent.press(screen.getByText("Not now"));
  expect(onClose).toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId("meeting-point-done"));
  expect(onDone).toHaveBeenCalledWith(AREA);
});
