import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { color } from "../theme/tokens";
import { DotRing, DOTS, HEAD_SCALE, litDots } from "./DotRing";

const tint = color.stretch.body;

type Dot = {
  left: number;
  top: number;
  width: number;
  backgroundColor: string;
  transform: { scale: number }[];
};
const look = (node: { props: Record<string, unknown> }) =>
  StyleSheet.flatten(node.props.style as object) as Dot;

describe("the ring of dots", () => {
  it("lights as many dots as the time left, of 48", () => {
    expect(DOTS).toBe(48);
    expect(litDots(30, 30)).toBe(48);
    expect(litDots(15, 30)).toBe(24);
    expect(litDots(1, 30)).toBe(2);
    expect(litDots(0, 30)).toBe(0);
    // Never more than there are, never fewer than none.
    expect(litDots(40, 30)).toBe(48);
    expect(litDots(-1, 30)).toBe(0);
    expect(litDots(5, 0)).toBe(0);
  });

  it("draws 48 round dots on a circle, from the top clockwise", async () => {
    await render(<DotRing size={240} lit={12} tint={tint} testID="ring" />);
    const ring = screen.getByTestId("ring", { includeHiddenElements: true });
    const on = screen.getAllByTestId("ring-on", { includeHiddenElements: true });
    const off = screen.getAllByTestId("ring-off", { includeHiddenElements: true });
    expect(on).toHaveLength(12);
    expect(off).toHaveLength(36);
    expect(ring).toBeTruthy();
    const dots = [...on, ...off].map(look);
    // All as far from the middle as each other.
    const centre = (dot: Dot) =>
      Math.hypot(dot.left + dot.width / 2 - 120, dot.top + dot.width / 2 - 120);
    for (const dot of dots) {
      expect(centre(dot)).toBeCloseTo(centre(dots[0]), 6);
      expect(dot.width).toBeGreaterThanOrEqual(2);
    }
    // The first is at the top; a quarter round, the twelfth after it is on the right.
    expect(dots[0].left + dots[0].width / 2).toBeCloseTo(120, 6);
    expect(dots[0].top).toBeLessThan(20);
    expect(look(off[0]).left).toBeGreaterThan(200);
  });

  it("lights dots in the group's colour, the last one lit a little bigger", async () => {
    await render(<DotRing size={240} lit={3} tint={tint} testID="ring" />);
    const on = screen
      .getAllByTestId("ring-on", { includeHiddenElements: true })
      .map(look);
    const off = screen
      .getAllByTestId("ring-off", { includeHiddenElements: true })
      .map(look);
    expect(on.map((dot) => dot.backgroundColor)).toEqual([tint, tint, tint]);
    expect(on.map((dot) => dot.transform[0].scale)).toEqual([1, 1, HEAD_SCALE]);
    expect(new Set(off.map((dot) => dot.backgroundColor))).toEqual(
      new Set([color.surfaceRaised]),
    );
    expect(off.every((dot) => dot.transform[0].scale === 1)).toBe(true);
  });

  it("holds what is given inside it, and hides itself from a screen reader", async () => {
    await render(
      <DotRing size={200} lit={0} tint={tint} testID="ring">
        <Text>inside</Text>
      </DotRing>,
    );
    expect(screen.queryByTestId("ring")).toBeNull();
    expect(screen.getByText("inside", { includeHiddenElements: true })).toBeTruthy();
    expect(
      screen.queryAllByTestId("ring-on", { includeHiddenElements: true }),
    ).toHaveLength(0);
  });
});
