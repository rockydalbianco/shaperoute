import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { androidBack } from "../ui/androidBack.testing";
import { runAnimationsOnJs } from "../ui/animationsOnJs.testing";
import { useBackCloses } from "../ui/backLayers";
import { useReduceMotion } from "../ui/useReduceMotion";
import { type ShellPage, TabShell } from "./TabShell";

// Android's «back» with a page open over the tabs (TASK-470, bug 2): it
// closes the page, and only then goes to the tab shown before. It once
// changed the tab under the page left open, or left the app.

jest.mock("../haptics/haptics", () => ({ selectionFeel: jest.fn() }));
jest.mock("../ui/useReduceMotion");

function Over({ onClose }: { onClose: () => void }) {
  useBackCloses(true, onClose);
  return <Text>conversation open</Text>;
}

/** «Draw» opens a page of its own, kept while another tab is on screen. */
function DrawPage() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="open in Draw"
        onPress={() => setOpen(true)}
      />
      {open && <Over onClose={() => setOpen(false)} />}
    </>
  );
}

const PAGES: ShellPage[] = ["Feed", "Draw", "Messages", "Explore"].map(
  (title, index) => ({
    title,
    label: title,
    icon: (["house", "pencil", "send", "search"] as const)[index],
    render: () => (title === "Draw" ? <DrawPage /> : <Text>{`${title} page`}</Text>),
  }),
);

function App({ shell = true }: { shell?: boolean }) {
  const [page, setPage] = useState(1);
  const [over, setOver] = useState(false);
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      {shell && <TabShell pages={PAGES} page={page} onPage={setPage} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="open over"
        onPress={() => setOver(true)}
      />
      {over && <Over onClose={() => setOver(false)} />}
    </SafeAreaProvider>
  );
}

let back: ReturnType<typeof androidBack>;
beforeEach(() => {
  jest.useFakeTimers();
  runAnimationsOnJs();
  jest.mocked(useReduceMotion).mockReturnValue(false);
  back = androidBack();
});
afterEach(() => {
  back.restore();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function pressBack(): Promise<boolean> {
  let handled = false;
  await act(() => {
    handled = back.press();
  });
  return handled;
}

function selected(title: string) {
  return screen.getByRole("tab", { name: title, selected: true });
}

test("«back» closes the page over the tabs first, and the tab stays", async () => {
  await render(<App />);
  await fireEvent.press(screen.getByRole("tab", { name: "Feed" }));
  await fireEvent.press(screen.getByRole("tab", { name: "Explore" }));
  await fireEvent.press(screen.getByRole("button", { name: "open over" }));

  expect(await pressBack()).toBe(true);
  expect(screen.queryByText("conversation open")).toBeNull();
  expect(selected("Explore")).toBeOnTheScreen();

  // Then, as before, the tab shown before.
  expect(await pressBack()).toBe(true);
  expect(selected("Feed")).toBeOnTheScreen();
});

test("with no tab before, «back» closes the page instead of leaving the app", async () => {
  await render(<App />);
  await fireEvent.press(screen.getByRole("button", { name: "open over" }));
  expect(await pressBack()).toBe(true);
  expect(screen.queryByText("conversation open")).toBeNull();
  expect(await pressBack()).toBe(false);
});

test("the tabs built again after the map, the page opened before still closes first", async () => {
  const view = await render(<App shell={false} />);
  await fireEvent.press(screen.getByRole("button", { name: "open over" }));
  // Back from the map: the bar is built again, its listener the newest.
  await view.rerender(<App />);
  await fireEvent.press(screen.getByRole("tab", { name: "Feed" }));

  expect(await pressBack()).toBe(true);
  expect(screen.queryByText("conversation open")).toBeNull();
  expect(selected("Feed")).toBeOnTheScreen();
});

test("a page open on a tab out of sight is left alone: «back» goes to the tab before", async () => {
  await render(<App />);
  await fireEvent.press(screen.getByRole("button", { name: "open in Draw" }));
  await fireEvent.press(screen.getByRole("tab", { name: "Feed" }));

  expect(await pressBack()).toBe(true);
  expect(selected("Draw")).toBeOnTheScreen();
  expect(screen.getByText("conversation open")).toBeOnTheScreen();
  // On screen again, it is the page's.
  expect(await pressBack()).toBe(true);
  expect(screen.queryByText("conversation open")).toBeNull();
});
