import { fireEvent, render, screen } from "@testing-library/react-native";

import { SkiDaySections } from "./SkiDaySections";

// «Summary · Map · Runs» on a day of skiing (TASK-429 part B).

test("shows the three sections, the one on screen selected", async () => {
  await render(<SkiDaySections section="map" onSection={jest.fn()} />);
  expect(screen.getAllByRole("tab")).toHaveLength(3);
  expect(screen.getByRole("tab", { name: "Summary" })).not.toBeSelected();
  expect(screen.getByRole("tab", { name: "Map" })).toBeSelected();
  expect(screen.getByRole("tab", { name: "Runs" })).not.toBeSelected();
});

test("a touch asks for its section", async () => {
  const onSection = jest.fn();
  await render(<SkiDaySections section="summary" onSection={onSection} />);
  await fireEvent.press(screen.getByRole("tab", { name: "Runs" }));
  expect(onSection).toHaveBeenCalledWith("runs");
});
