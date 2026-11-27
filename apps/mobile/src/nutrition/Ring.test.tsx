import { render, screen } from "@testing-library/react-native";
import { Animated } from "react-native";

import { useReduceMotion } from "../ui/useReduceMotion";
import { ringShares } from "./dayRings";
import { EnergyRings } from "./EnergyRings";
import { clampShare, Ring } from "./Ring";

// The rings of a day (TASK-489 part H).

jest.mock("../ui/useReduceMotion", () => ({ useReduceMotion: jest.fn() }));

const reduceMotion = jest.mocked(useReduceMotion);

beforeEach(() => {
  reduceMotion.mockReturnValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("a share is kept between nothing and the whole ring", () => {
  expect(clampShare(0.4)).toBe(0.4);
  expect(clampShare(-1)).toBe(0);
  expect(clampShare(7)).toBe(1);
  expect(clampShare(Number.NaN)).toBe(0);
});

test("a ring goes to its share on the app's spring", async () => {
  const spring = jest.spyOn(Animated, "spring");
  await render(
    <Ring size={100} stroke={10} share={0.75} colour="#111111" track="#222222" />,
  );
  expect(spring).toHaveBeenCalledTimes(1);
  expect(spring.mock.calls[0][1]).toMatchObject({
    toValue: 0.75,
    useNativeDriver: true,
  });
});

test("with «Reduce Motion» no spring is started", async () => {
  reduceMotion.mockReturnValue(true);
  const spring = jest.spyOn(Animated, "spring");
  await render(
    <Ring size={100} stroke={10} share={0.75} colour="#111111" track="#222222" />,
  );
  expect(spring).not.toHaveBeenCalled();
});

test("the rings are a picture: screen readers pass them by", async () => {
  await render(<EnergyRings shares={ringShares(1500, 2000, null)} />);
  for (const id of ["diary-ring-used", "diary-ring-eaten"]) {
    const ring = screen.getByTestId(id, { includeHiddenElements: true });
    expect(ring.props.accessibilityElementsHidden).toBe(true);
    expect(ring.props.importantForAccessibility).toBe("no-hide-descendants");
  }
  expect(
    screen.queryByTestId("diary-ring-target", { includeHiddenElements: true }),
  ).toBeNull();
});

test("the user's target is a notch on the ring of «Eaten», where it falls", async () => {
  await render(<EnergyRings shares={ringShares(2500, 2000, 2000)} />);
  const notch = screen.getByTestId("diary-ring-target", {
    includeHiddenElements: true,
  });
  // 2000 of 2500: four fifths of the way round.
  expect(notch.props.style).toEqual(
    expect.arrayContaining([{ transform: [{ rotate: "288deg" }] }]),
  );
});
