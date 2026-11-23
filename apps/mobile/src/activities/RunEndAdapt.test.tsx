import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan, GymProgram } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { forgetPlans, mergePlans, plansOf } from "../gym/plans";
import {
  ActivitiesContext,
  type ActivitiesDoor,
  useActivitiesDoor,
} from "./activitiesDoor";
import { RunEnd } from "./RunEnd";

// «How did it go?» at the end of a run on a run day of a plan (TASK-488):
// the run's question over the form, kept with the run's «Save».

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../settings/useSport", () => ({ useSport: () => "run" }));

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

const [, , , LIFT_AND_RUN] = plans.plans as GymPlan[];
const { adapt: _adapt, ...program } = LIFT_AND_RUN.program as GymProgram;
const PLAN: GymPlan = { ...LIFT_AND_RUN, program };

async function shown() {
  function WithDoor() {
    const nothing = useActivitiesDoor();
    const door: ActivitiesDoor = { ...nothing, signedIn: true, owner: 7 };
    return (
      <ActivitiesContext.Provider value={door}>
        <RunEnd onSave={() => true} onDiscard={jest.fn()} health={null} sleep={null} />
      </ActivitiesContext.Provider>
    );
  }
  await render(<WithDoor />);
  await act(async () => {});
}

const save = () =>
  fireEvent.press(screen.getByRole("button", { name: "Save to My activities" }));

beforeEach(() => {
  files.clear();
  forgetPlans();
  mergePlans(7, [PLAN]);
});

afterEach(() => jest.useRealTimers());

const onlyTheDate = (now: Date) =>
  jest.useFakeTimers({
    now,
    doNotFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "setImmediate",
      "clearImmediate",
      "nextTick",
      "queueMicrotask",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ],
  });

test("Saturday's long run of the plan: asked, kept with «Save»", async () => {
  onlyTheDate(new Date(2026, 10, 7, 9));
  await shown();
  expect(screen.getByTestId("adapt-question")).toHaveTextContent(
    /Long run of the plan: how did it go\?/,
  );
  await fireEvent.press(screen.getByTestId("adapt-easy"));
  expect(screen.getByTestId("adapt-line")).toHaveTextContent(
    /Long run.*60 min → 70 min/,
  );
  await save();
  await act(async () => {});
  expect(plansOf(7)[0].program?.adapt).toEqual({
    off: false,
    days: [{ day: 6, steps: 1, hard: 0, last: "easy" }],
  });
});

test("a day without a run in the plan: no question", async () => {
  onlyTheDate(new Date(2026, 10, 6, 9));
  await shown();
  expect(screen.queryByTestId("adapt-question")).toBeNull();
});
