import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Tip } from "./rules";
import { TipCard } from "./TipCard";

const APPLY: Tip = {
  rule: "P1",
  group: 2,
  exercise: "bench_press",
  values: { kg: 62.5, old: 60, min: 8 },
  change: { plan: "p", exercise: "bench_press", deltaKg: 2.5 },
};

const SAY: Tip = { rule: "C2", group: 3, values: { pct: 55 } };

test("a tip that changes the plan: «Apply to plan» and «Not now»", async () => {
  const onApply = jest.fn();
  const onPutOff = jest.fn();
  await render(
    <TipCard tip={APPLY} language="en" onApply={onApply} onPutOff={onPutOff} />,
  );
  expect(screen.getByText("Bench press: 62.5 kg")).toBeOnTheScreen();
  expect(screen.getByText("Why: Double progression · ACSM 2009")).toBeOnTheScreen();
  expect(screen.queryByText("OK")).toBeNull();
  await fireEvent.press(screen.getByText("Apply to plan"));
  expect(onApply).toHaveBeenCalledTimes(1);
  expect(onPutOff).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText("Not now"));
  expect(onPutOff).toHaveBeenCalledTimes(1);
});

test("a tip that only says something: «OK»", async () => {
  const onApply = jest.fn();
  const onPutOff = jest.fn();
  await render(
    <TipCard tip={SAY} language="en" onApply={onApply} onPutOff={onPutOff} />,
  );
  expect(screen.getByText("Next run: slow and long")).toBeOnTheScreen();
  expect(screen.queryByText("Apply to plan")).toBeNull();
  expect(screen.queryByText("Not now")).toBeNull();
  await fireEvent.press(screen.getByText("OK"));
  expect(onPutOff).toHaveBeenCalledTimes(1);
  expect(onApply).not.toHaveBeenCalled();
});
