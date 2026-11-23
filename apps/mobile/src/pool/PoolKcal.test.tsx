/**
 * The calories at the end of a swim in a pool (TASK-409 part A, ADR-0318
 * «il nuoto in piscina»): a fifth figure, «Calories», from the lengths
 * written and the body of «Body»; «–» until the lengths are valid.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { NO_BODY, saveBody } from "../body/bodyProfile";
import { finishPoolSwim, newPoolSwim } from "./poolSwim";
import { PoolSwimEnd } from "./PoolSwimEnd";

jest.mock("expo-file-system");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const T0 = Date.UTC(2026, 10, 6, 7);
const MIN = 60_000;

const signedOut = {
  signedIn: false,
  owner: null,
  refresh: jest.fn(),
  signIn: jest.fn(),
} as unknown as ActivitiesDoor;

async function end() {
  // 40 minutes in a pool of 25 m.
  const swim = finishPoolSwim(newPoolSwim("key12345abc", 25, T0), T0 + 40 * MIN);
  await render(
    <ActivitiesContext.Provider value={signedOut}>
      <PoolSwimEnd swim={swim} onSave={jest.fn()} health={null} />
    </ActivitiesContext.Provider>,
  );
}

afterEach(() => {
  saveBody(NO_BODY);
});

test("the calories of the lengths written, «–» without them", async () => {
  await end();
  await fireEvent.changeText(screen.getByTestId("pool-lengths"), "60");
  // 1500 m in 40 min at 2:40 /100 m, 70 kg (poolKcal.test.ts).
  expect(screen.getByTestId("pool-kcal")).toHaveTextContent("235 kcal");
  expect(screen.getByLabelText("Calories: 235 kcal")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByTestId("pool-lengths"), "");
  expect(screen.getByTestId("pool-kcal")).toHaveTextContent("–");
});

test("with the weight of «Body»", async () => {
  await end();
  await act(async () => saveBody({ ...NO_BODY, weightKg: 80 }));
  await fireEvent.changeText(screen.getByTestId("pool-lengths"), "60");
  expect(screen.getByTestId("pool-kcal")).toHaveTextContent("269 kcal");
});
