/**
 * «Messages» over the app (TASK-319) puts the app under it as every other
 * page over the app does: out of the screen reader's sight, and kept as a
 * view of its own, so nothing of the app is drawn over the page (TASK-469:
 * the header came out over a conversation opened from the tab).
 */
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { apiError } from "../account/testing";
import { useMessagesDoor } from "../messages/messagesDoor";
import { ProfileLayer } from "./ProfileLayer";

jest.mock("react-native-webview");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");
jest.mock("expo-secure-store", () =>
  jest
    .requireActual<typeof import("../account/testing")>("../account/testing")
    .memorySecureStore(),
);

const API = "http://api";

beforeEach(() => {
  jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input) =>
      Response.json(apiError("http_error", String(input)), { status: 404 }),
    );
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** The app, as far as this goes: a way to the message requests. */
function TheApp() {
  const { openList, close } = useMessagesDoor();
  return (
    <>
      <Pressable onPress={() => openList("requests")} accessibilityRole="button">
        <Text>Open requests</Text>
      </Pressable>
      <Pressable onPress={close} accessibilityRole="button" testID="close">
        <Text>Close them</Text>
      </Pressable>
    </>
  );
}

/** How the app's own view is told to the screen reader. */
function appSight(): string {
  let view = screen.getByTestId("close", { includeHiddenElements: true }).parent;
  while (view !== null && view.props.importantForAccessibility === undefined) {
    view = view.parent;
  }
  return String(view?.props.importantForAccessibility);
}

test("under «Messages» the app is out of the screen reader's sight, and back after", async () => {
  await render(
    <ProfileLayer apiUrl={API}>
      <TheApp />
    </ProfileLayer>,
  );
  expect(appSight()).toBe("auto");
  await fireEvent.press(screen.getByRole("button", { name: "Open requests" }));
  expect(
    await screen.findByRole("header", { name: "Message requests" }),
  ).toBeOnTheScreen();
  expect(appSight()).toBe("no-hide-descendants");
  await fireEvent.press(screen.getByTestId("close", { includeHiddenElements: true }));
  expect(screen.queryByRole("header", { name: "Message requests" })).toBeNull();
  expect(appSight()).toBe("auto");
});
