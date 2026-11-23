import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { selectionFeel } from "../haptics/haptics";
import { useReduceMotion } from "../ui/useReduceMotion";
import { PlayTabs } from "./PlayTabs";
import { SlideIn } from "./SlideIn";

jest.mock("../haptics/haptics", () => ({ selectionFeel: jest.fn() }));
jest.mock("../ui/useReduceMotion", () => ({ useReduceMotion: jest.fn(() => false) }));

const OPTIONS = [
  { value: "collection", label: "Collection" },
  { value: "challenges", label: "Challenges" },
] as const;

beforeEach(() => {
  jest.mocked(selectionFeel).mockClear();
  jest.mocked(useReduceMotion).mockReturnValue(false);
});

// The motion of «Play» (TASK-423, «1–4, solo Play»).

test("the tabs say which is chosen; another touched ticks and changes", async () => {
  const onChange = jest.fn();
  await render(<PlayTabs options={OPTIONS} value="collection" onChange={onChange} />);
  expect(
    screen.getByRole("button", { name: "Collection", selected: true }),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Challenges" }));
  expect(onChange).toHaveBeenCalledWith("challenges");
  expect(selectionFeel).toHaveBeenCalledTimes(1);
  // The one chosen, touched again: no tick.
  await fireEvent.press(screen.getByRole("button", { name: "Collection" }));
  expect(selectionFeel).toHaveBeenCalledTimes(1);
});

test("the pill is drawn once the track knows its width, one tab wide", async () => {
  await render(<PlayTabs options={OPTIONS} value="challenges" onChange={jest.fn()} />);
  expect(screen.queryByTestId("play-tabs-pill")).toBeNull();
  await act(async () =>
    fireEvent(screen.getByTestId("play-tabs"), "layout", {
      nativeEvent: { layout: { width: 208, height: 52, x: 0, y: 0 } },
    }),
  );
  // 208 less the padding (2 × 4) and the gap (4), in two.
  expect(screen.getByTestId("play-tabs-pill")).toHaveStyle({ width: 98 });
});

test("a page slides in; with «Reduce Motion» it is just there", async () => {
  await render(
    <SlideIn from="right" testID="page">
      <></>
    </SlideIn>,
  );
  expect(screen.getByTestId("page")).toHaveStyle({ opacity: 0 });
  screen.unmount();
  jest.mocked(useReduceMotion).mockReturnValue(true);
  await render(
    <SlideIn from="left" testID="still">
      <></>
    </SlideIn>,
  );
  expect(screen.getByTestId("still")).toHaveStyle({ opacity: 1 });
});
