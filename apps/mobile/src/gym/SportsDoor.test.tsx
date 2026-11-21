import { fireEvent, render, screen } from "@testing-library/react-native";

import { bodyweightSession } from "./bodyweight";
import {
  countsFor,
  DOOR_CHOSEN,
  proposalKey,
  SportsDoor,
  sportsOf,
  spreadDays,
} from "./SportsDoor";

// TASK-461 A2 (ADR-0371): «Cosa vuoi allenare?», at least two sports
// («Almeno due, sempre»), their days already spread out.

test("the door: seven sports to choose, those with a distance in blue", async () => {
  const onToggle = jest.fn();
  await render(<SportsDoor chosen={DOOR_CHOSEN} onToggle={onToggle} />);
  expect(screen.getByTestId("door-gym")).not.toBeChecked();
  expect(screen.getByTestId("door-body")).toBeChecked();
  expect(screen.getByTestId("door-run")).toBeChecked();
  expect(screen.getByTestId("door-mountain")).toHaveTextContent(/Mountains/);
  expect(screen.getByTestId("door-bike")).toHaveTextContent(/Road, gravel, MTB/);
  await fireEvent.press(screen.getByTestId("door-gym"));
  expect(onToggle).toHaveBeenCalledWith("gym");
});

test("the days proposed: three of bodyweight and two runs, as the mockup", () => {
  expect(countsFor(DOOR_CHOSEN)).toEqual({
    gym: 0,
    body: 3,
    run: 2,
    walk: 0,
    bike: 0,
    swim: 0,
    mountain: 0,
  });
  expect(spreadDays(DOOR_CHOSEN, countsFor(DOOR_CHOSEN))).toMatchObject({
    gym: [],
    body: [1, 3, 5],
    run: [2, 6],
  });
});

test("the gym and bodyweight: two each, apart; with running one run more", () => {
  const all = ["gym", "body", "run"] as const;
  expect(countsFor(all)).toMatchObject({ gym: 2, body: 2, run: 1 });
  expect(spreadDays(all, countsFor(all))).toMatchObject({
    gym: [1, 4],
    body: [2, 6],
    run: [7],
  });
  // Too many days: the week has seven.
  const full = spreadDays(all, {
    gym: 5,
    body: 4,
    run: 4,
    walk: 0,
    bike: 0,
    swim: 0,
    mountain: 0,
  });
  expect(new Set([...full.gym, ...full.body, ...full.run]).size).toBe(
    full.gym.length + full.body.length + full.run.length,
  );
});

test("the first sport with a distance gets two days, each other one", () => {
  const chosen = ["body", "bike", "run"] as const;
  expect(countsFor(chosen)).toMatchObject({ body: 3, bike: 2, run: 1 });
  const spread = spreadDays(chosen, countsFor(chosen));
  expect(spread.body).toEqual([1, 3, 5]);
  expect(spread.bike).toEqual([2, 6]);
  expect(spread.run).toEqual([4]);
});

test("a plan's sports from its days", () => {
  const naming = (text: string) => text;
  expect(
    sportsOf([
      bodyweightSession(0, 1, "tone", "none", naming),
      { day: 2, name: "Easy run", items: [], run: { kind: "easy", distance_m: 5000 } },
    ]),
  ).toEqual(["body", "run"]);
  expect(proposalKey("tone", "bar", ["body", "run"])).toBe("tone|bar|body,run");
});
