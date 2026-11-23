import { render, screen } from "@testing-library/react-native";

import { color } from "../theme/tokens";
import { CHART_HEIGHT, PostElevation } from "./PostElevation";
import { PostSplits } from "./PostSplits";

// The table of the splits and the profile of a post (TASK-410 part D):
// bars and columns of `View`, the fastest in the brand's yellow.

const ROWS = [
  { label: "1", pace: "5:12 /km", share: 0.96, fastest: false, partial: false },
  { label: "2", pace: "4:59 /km", share: 1, fastest: true, partial: false },
  { label: "0.43", pace: "5:26 /km", share: 0.92, fastest: false, partial: true },
];

test("a line a kilometre, the fastest in accent, the bars as long as fast", async () => {
  await render(<PostSplits unit="Km" rows={ROWS} fastest="Fastest: km 2 · 4:59 /km" />);
  expect(screen.getByText("4:59 /km")).toHaveStyle({ color: color.accent });
  expect(screen.getByText("5:12 /km")).toHaveStyle({ color: color.text });
  const bars = screen.getAllByTestId("split-bar");
  expect(bars.map((bar) => bar.props.style)).toEqual([
    expect.arrayContaining([{ width: "96%" }]),
    expect.arrayContaining([{ width: "100%" }]),
    expect.arrayContaining([{ width: "92%" }]),
  ]);
  expect(screen.getByLabelText("Km 0.43: 5:26 /km")).toBeOnTheScreen();
  expect(screen.getByText("Fastest: km 2 · 4:59 /km")).toBeOnTheScreen();
});

test("no fastest, no line under the table", async () => {
  await render(<PostSplits unit="Mile" rows={[ROWS[2]]} fastest={null} />);
  expect(screen.queryByText(/Fastest/)).toBeNull();
});

test("the profile: a column a point, as high as the ground", async () => {
  await render(<PostElevation gain="+21 m" columns={[0.06, 1, 0.5]} label="Profile" />);
  const chart = screen.getByLabelText("Profile");
  const heights = chart.props.children.map(
    (column: { props: { style: { height: number }[] } }) =>
      column.props.style[1].height,
  );
  expect(heights).toEqual([
    Math.round(0.06 * CHART_HEIGHT),
    CHART_HEIGHT,
    Math.round(0.5 * CHART_HEIGHT),
  ]);
  expect(screen.getByText("+21 m")).toBeOnTheScreen();
});
