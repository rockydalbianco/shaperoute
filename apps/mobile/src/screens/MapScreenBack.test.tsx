import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { androidBack } from "../ui/androidBack.testing";
import { MapScreen } from "./MapScreen";

// Android's «back» on the map opened from a tab (TASK-470, bug 2): it is the
// «←», back to the page the map was opened from; it once left the app.
// During a run the banner takes the «←»'s place, and «back» is not the map's.

jest.mock("../map/MapKindButton", () => ({ MapKindButton: () => null }));

let back: ReturnType<typeof androidBack>;
beforeEach(() => {
  back = androidBack();
});
afterEach(() => {
  back.restore();
});

function Map({
  onBack,
  banner,
  active = true,
}: {
  onBack: () => void;
  banner?: boolean;
  active?: boolean;
}) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <MapScreen
        map={null}
        active={active}
        onBack={onBack}
        mapError={null}
        banner={banner ? <Text>Turn left</Text> : undefined}
      >
        <Text>route</Text>
      </MapScreen>
    </SafeAreaProvider>
  );
}

test("«back» on the map is its «←»", async () => {
  const onBack = jest.fn();
  await render(<Map onBack={onBack} />);
  let handled = false;
  await act(() => {
    handled = back.press();
  });
  expect(handled).toBe(true);
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("during a run, or with the map out of sight, «back» is not the map's", async () => {
  const onBack = jest.fn();
  const view = await render(<Map onBack={onBack} banner />);
  expect(back.press()).toBe(false);
  await view.rerender(<Map onBack={onBack} active={false} />);
  expect(back.press()).toBe(false);
  expect(onBack).not.toHaveBeenCalled();
});
