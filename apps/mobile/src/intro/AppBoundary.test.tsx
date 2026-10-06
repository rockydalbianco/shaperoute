import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { AppBoundary, errorDetail } from "./AppBoundary";

/** Throws while it draws until told not to: a broken component of the app. */
let broken = true;
function Flaky() {
  if (broken) {
    throw new Error("state.route is undefined");
  }
  return <Text>The app</Text>;
}

let consoleError: jest.SpyInstance;
beforeEach(() => {
  broken = true;
  // React writes every error a boundary catches to the console.
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

test("a component that throws while drawing shows the yellow screen, not white", async () => {
  await render(
    <AppBoundary>
      <Flaky />
    </AppBoundary>,
  );
  expect(screen.getByTestId("app-broken")).toBeTruthy();
  expect(screen.getByText("Something went wrong.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  expect(screen.queryByText("The app")).toBeNull();
});

test("«Try again» mounts the app anew", async () => {
  await render(
    <AppBoundary>
      <Flaky />
    </AppBoundary>,
  );
  broken = false;
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByText("The app")).toBeTruthy();
  expect(screen.queryByTestId("app-broken")).toBeNull();
});

test("an app that throws again shows the screen again", async () => {
  await render(
    <AppBoundary>
      <Flaky />
    </AppBoundary>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByText("Something went wrong.")).toBeTruthy();
});

test("without an error the app is drawn as it is", async () => {
  broken = false;
  await render(
    <AppBoundary>
      <Flaky />
    </AppBoundary>,
  );
  expect(screen.getByText("The app")).toBeTruthy();
  expect(screen.queryByTestId("app-broken")).toBeNull();
});

test("the error is written in a development build only", async () => {
  const error = new Error("state.route is undefined");
  expect(errorDetail(error, true)).toBe("Error: state.route is undefined");
  expect(errorDetail(new Error(""), true)).toBe("Error");
  expect(errorDetail(error, false)).toBeNull();
  // Under jest, as in a development build.
  await render(
    <AppBoundary>
      <Flaky />
    </AppBoundary>,
  );
  expect(screen.getByText("Error: state.route is undefined")).toBeTruthy();
});
