/**
 * A swim in a pool, on its screen while it lasts (TASK-424 part C1): under
 * the clock the lengths estimated from the pace and their calories, the
 * same numbers «Share live» sends.
 */
import { render, screen } from "@testing-library/react-native";

import { newPoolSwim, pausePoolSwim } from "./poolSwim";
import { PoolSwimScreen } from "./PoolSwimScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
// No swims before this one: the pace is the default, 2:00 /100 m.
jest.mock("expo-file-system", () => {
  class File {
    get exists(): boolean {
      return false;
    }
    create(): void {}
    write(): void {}
    textSync(): string {
      return "";
    }
    delete(): void {}
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

const START = Date.UTC(2026, 10, 10, 7, 0, 0);
const MINUTE = 60_000;

test("ten minutes at 2:00 /100 m in a 25 m pool: 20 lengths and their calories", async () => {
  const swim = newPoolSwim("k", 25, START);
  await render(
    <PoolSwimScreen swim={swim} nowMs={START + 10 * MINUTE} apiKey={null} />,
  );
  expect(screen.getByTestId("pool-live-lengths")).toHaveTextContent("20");
  expect(screen.getByTestId("pool-live-kcal")).toHaveTextContent(/^[1-9]\d* kcal$/);
  expect(screen.getByLabelText("Lengths: 20")).toBeOnTheScreen();
});

test("at the start: no length yet, and no calories", async () => {
  const swim = newPoolSwim("k", 25, START);
  await render(<PoolSwimScreen swim={swim} nowMs={START + 5_000} apiKey={null} />);
  expect(screen.getByTestId("pool-live-lengths")).toHaveTextContent("0");
  expect(screen.getByTestId("pool-live-kcal")).toHaveTextContent("–");
});

test("a pause stops the lengths where they were", async () => {
  const paused = pausePoolSwim(newPoolSwim("k", 25, START), START + 10 * MINUTE);
  await render(
    <PoolSwimScreen swim={paused} nowMs={START + 30 * MINUTE} apiKey={null} />,
  );
  expect(screen.getByTestId("pool-live-lengths")).toHaveTextContent("20");
});
