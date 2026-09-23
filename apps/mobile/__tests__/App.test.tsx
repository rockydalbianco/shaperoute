import { SHAPES } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import App from "../App";

test("shows the app name and every shape from shared-types", async () => {
  await render(<App />);
  expect(screen.getByText("ShapeRoute")).toBeOnTheScreen();
  for (const shape of SHAPES) {
    expect(screen.getByText(shape)).toBeOnTheScreen();
  }
});
