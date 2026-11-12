import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, Text } from "react-native";

import { androidBack } from "./androidBack.testing";
import { openLayers, OnScreenContext, useBackCloses } from "./backLayers";

// Android's «back» for the pages opened over the app as views (TASK-470,
// bug 2): the page opened last closes, as its «←» does.

let back: ReturnType<typeof androidBack>;
beforeEach(() => {
  back = androidBack();
});
afterEach(() => {
  back.restore();
});

function Layer({ name, onClose }: { name: string; onClose: () => void }) {
  useBackCloses(true, onClose);
  return <Text>{`${name} open`}</Text>;
}

function Two() {
  const [first, setFirst] = useState(false);
  const [second, setSecond] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="first"
        onPress={() => setFirst(true)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="second"
        onPress={() => setSecond(true)}
      />
      {first && <Layer name="first" onClose={() => setFirst(false)} />}
      {second && <Layer name="second" onClose={() => setSecond(false)} />}
    </>
  );
}

test("nothing open: «back» is not the pages', the app's own goes on", async () => {
  await render(<Two />);
  expect(back.press()).toBe(false);
  expect(openLayers()).toBe(0);
});

test("the page opened last closes first, then the one under it, then nothing", async () => {
  await render(<Two />);
  await fireEvent.press(screen.getByRole("button", { name: "second" }));
  await fireEvent.press(screen.getByRole("button", { name: "first" }));
  expect(openLayers()).toBe(2);

  let handled = false;
  await act(() => {
    handled = back.press();
  });
  expect(handled).toBe(true);
  expect(screen.queryByText("first open")).toBeNull();
  expect(screen.getByText("second open")).toBeOnTheScreen();

  await act(() => {
    handled = back.press();
  });
  expect(handled).toBe(true);
  expect(screen.queryByText("second open")).toBeNull();
  expect(back.press()).toBe(false);
});

test("a page out of sight, on a tab not on screen, does not take «back»", async () => {
  const close = jest.fn();
  const view = await render(
    <OnScreenContext.Provider value={false}>
      <Layer name="hidden" onClose={close} />
    </OnScreenContext.Provider>,
  );
  expect(back.press()).toBe(false);
  expect(close).not.toHaveBeenCalled();

  // Its tab comes back on screen: «back» is its again.
  await view.rerender(
    <OnScreenContext.Provider value>
      <Layer name="hidden" onClose={close} />
    </OnScreenContext.Provider>,
  );
  expect(back.press()).toBe(true);
  expect(close).toHaveBeenCalledTimes(1);
});

test("the newest «←» is called, not the one of the first render", async () => {
  const first = jest.fn();
  const second = jest.fn();
  const view = await render(<Layer name="one" onClose={first} />);
  await view.rerender(<Layer name="one" onClose={second} />);
  expect(back.press()).toBe(true);
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});
