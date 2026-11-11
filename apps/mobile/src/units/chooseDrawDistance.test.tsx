import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { chooseDrawDistance, useDrawDistance } from "./useDrawDistance";

// A distance for «Draw» chosen elsewhere (TASK-433 C): a run day of the
// gym writes its km in the field, within the sport's limits.

function Field() {
  const distance = useDrawDistance("running");
  return <Text testID="metres">{String(distance.metres)}</Text>;
}

test("a distance chosen elsewhere is the field's", async () => {
  await render(<Field />);
  await act(async () => chooseDrawDistance(5500));
  expect(screen.getByTestId("metres")).toHaveTextContent("5500");
  await screen.unmount();
  // Nobody listens once «Draw» is gone: no error.
  expect(() => chooseDrawDistance(6000)).not.toThrow();
});
