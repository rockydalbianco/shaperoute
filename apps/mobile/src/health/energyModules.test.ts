import { energyReader, HEALTH_ENERGY_ON } from "./energyModules";

// Reading workouts and active energy from Apple Health is off until the
// native build whose permission text names them (TASK-489 part C2).

jest.mock("@kingstinct/react-native-healthkit", () => {
  throw new Error("the health library must not be loaded in this build");
});

test("the reading is off", () => {
  expect(HEALTH_ENERGY_ON).toBe(false);
});

test("there is no reader, and the health library is never loaded", () => {
  expect(energyReader()).toBeNull();
  expect(energyReader()).toBeNull();
});
