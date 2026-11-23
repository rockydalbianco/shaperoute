import { fireEvent, render, screen } from "@testing-library/react-native";

import { RoutineChooser } from "./RoutineChooser";

describe("the choice of how long to stretch", () => {
  it("names the routine and offers 3, 5 and 10 minutes", async () => {
    const onChoose = jest.fn();
    await render(
      <RoutineChooser routine="afterGym" onChoose={onChoose} onLeave={jest.fn()} />,
    );
    expect(screen.getByText("Stretch")).toBeTruthy();
    expect(screen.getByRole("header", { name: "After gym" })).toBeTruthy();
    expect(screen.getByText("How long?")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "5 min" }));
    await fireEvent.press(screen.getByRole("button", { name: "10 min" }));
    await fireEvent.press(screen.getByRole("button", { name: "3 min" }));
    expect(onChoose.mock.calls).toEqual([[5], [10], [3]]);
  });

  it("leaves with «Not now» and draws the figure for the eyes only", async () => {
    const onLeave = jest.fn();
    await render(
      <RoutineChooser routine="morning" onChoose={jest.fn()} onLeave={onLeave} />,
    );
    expect(screen.queryByTestId("stretch-figure")).toBeNull();
    expect(
      screen.getByTestId("stretch-figure", { includeHiddenElements: true }),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Not now" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
