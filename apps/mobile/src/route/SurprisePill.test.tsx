/**
 * «Surprise me» (TASK-448): the pill beside «2 WHAT YOU DRAW». It only
 * asks: what it gives is `surprisePick`'s, tested there.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import {
  AccessibilityInfo,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from "react-native";

import { saveLanguageChoice } from "../i18n/language";
import { color, MIN_TAP_SIZE } from "../theme/tokens";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";
import {
  announcePick,
  PILL_HEIGHT,
  PILL_ICON,
  pickSaid,
  SurprisePill,
} from "./SurprisePill";

jest.mock("../ui/useGlassMode", () => ({
  ...jest.requireActual("../ui/useGlassMode"),
  useGlassMode: jest.fn(),
}));

const glassMode = useGlassMode as jest.MockedFunction<typeof useGlassMode>;

type Face = ViewStyle & { boxShadow?: unknown[] };

function face(): Face {
  const style = screen.getByTestId("surprise-me").props.style as StyleProp<ViewStyle>;
  return (StyleSheet.flatten(style) ?? {}) as Face;
}

beforeEach(() => {
  glassMode.mockReturnValue("glass");
});

afterEach(async () => {
  await act(async () => {
    saveLanguageChoice("phone");
  });
});

test("a button with its name, and a tap asks for a surprise", async () => {
  const onPress = jest.fn();
  await render(<SurprisePill onPress={onPress} />);
  const pill = screen.getByRole("button", { name: "Surprise me" });
  expect(screen.getByText("Surprise me")).toBeOnTheScreen();
  await fireEvent.press(pill);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("the dice beside the name, in the colour of the words, not read aloud", async () => {
  await render(<SurprisePill onPress={jest.fn()} />);
  const icon = screen.getByTestId("surprise-me-icon");
  expect(icon).toHaveStyle({
    width: PILL_ICON,
    height: PILL_ICON,
    tintColor: color.text,
  });
  expect(icon.props.accessible).toBe(false);
});

test("low beside the title, with the whole tap size for the finger", async () => {
  await render(<SurprisePill onPress={jest.fn()} />);
  const pill = screen.getByTestId("surprise-me");
  expect(face().height).toBe(PILL_HEIGHT);
  expect(PILL_HEIGHT + 2 * (pill.props.hitSlop as number)).toBe(MIN_TAP_SIZE);
});

test("never yellow: the yellow is the route's", async () => {
  await render(<SurprisePill onPress={jest.fn()} />);
  expect(face().backgroundColor).toBe(color.surfaceRaised);
  expect(face().backgroundColor).not.toBe(color.accent);
  expect(screen.getByText("Surprise me")).toHaveStyle({ color: color.text });
});

test("it stands out of the glass; flat with «Reduce Transparency» or «Increase Contrast»", async () => {
  await render(<SurprisePill onPress={jest.fn()} />);
  expect(face().boxShadow).toHaveLength(2);
  for (const mode of ["solid", "contrast"] as GlassMode[]) {
    glassMode.mockReturnValue(mode);
    await screen.rerender(<SurprisePill onPress={jest.fn()} />);
    expect(face().boxShadow).toBeUndefined();
  }
});

test("while the routes near are asked it waits: dimmed, and a tap is nothing", async () => {
  const onPress = jest.fn();
  await render(<SurprisePill onPress={onPress} busy />);
  const pill = screen.getByRole("button", { name: "Surprise me" });
  expect(pill).toBeDisabled();
  expect(pill.props.accessibilityState).toMatchObject({ busy: true });
  expect(screen.getByText("Surprise me")).toHaveStyle({ opacity: 0.5 });
  expect(screen.getByTestId("surprise-me-icon")).toHaveStyle({ opacity: 0.5 });
  await fireEvent.press(pill);
  expect(onPress).not.toHaveBeenCalled();
});

test.each([
  ["it", "Sorprendimi"],
  ["de", "Überrasch mich"],
  ["es", "Sorpréndeme"],
  ["fr", "Surprends-moi"],
] as const)("in %s it is «%s»", async (language, name) => {
  await act(async () => {
    saveLanguageChoice(language);
  });
  await render(<SurprisePill onPress={jest.fn()} />);
  expect(screen.getByRole("button", { name })).toBeOnTheScreen();
  expect(screen.getByText(name)).toBeOnTheScreen();
});

test("the pick is said with words the page already has", () => {
  expect(pickSaid({ shape: "heart", distanceM: 5000 }, "km")).toBe("Heart, 5 km");
  expect(pickSaid({ shape: "dog_head", distanceM: 10000 }, "km")).toBe(
    "Dog head, 10 km",
  );
  expect(pickSaid({ shape: "heart", distanceM: 4828 }, "mi")).toBe("Heart, 3 mi");
});

test("a screen reader hears the pick", () => {
  const said = jest
    .spyOn(AccessibilityInfo, "announceForAccessibility")
    .mockImplementation(() => {});
  announcePick({ shape: "star", distanceM: 10000 }, "km");
  expect(said).toHaveBeenCalledWith("Star, 10 km");
  said.mockRestore();
});

test("in Italian the pick is said in Italian", async () => {
  await act(async () => {
    saveLanguageChoice("it");
  });
  expect(pickSaid({ shape: "heart", distanceM: 5000 }, "km")).toBe("Cuore, 5 km");
});
