import { fireEvent, render, screen } from "@testing-library/react-native";

import { EmptyState } from "./EmptyState";
import { HEART } from "./outlines";

test("says what is missing, gently, and offers nothing it was not given", async () => {
  await render(
    <EmptyState
      outline={HEART}
      title="Nothing kept yet"
      message="When a route catches your eye, tap the heart on its map."
      testID="empty"
    />,
  );
  expect(screen.getByRole("header", { name: "Nothing kept yet" })).toBeTruthy();
  expect(screen.getByText(/tap the heart on its map/)).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});

test("the one thing to do about it is a button", async () => {
  const onPress = jest.fn();
  await render(
    <EmptyState
      outline={HEART}
      title="Nothing kept yet"
      message="It will wait for you here."
      action={{ label: "Look around Explore", onPress }}
    />,
  );
  fireEvent.press(screen.getByRole("button", { name: "Look around Explore" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("the heart is a closed outline in the unit square, starting at the notch", () => {
  expect(HEART.length).toBeGreaterThanOrEqual(60);
  expect(HEART[0]).toEqual(HEART[HEART.length - 1]);
  for (const [x, y] of HEART) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(1);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(1);
  }
  // The notch: halfway across, below the top of the lobes.
  const [x0, y0] = HEART[0];
  expect(x0).toBeCloseTo(0.5, 2);
  expect(y0).toBeGreaterThan(0.1);
  expect(y0).toBeLessThan(0.35);
  // The pen leaves it to the right, as a run would.
  expect(HEART[1][0]).toBeGreaterThan(x0);
});
