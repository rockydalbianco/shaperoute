import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, type ViewStyle } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { color, glass } from "../theme/tokens";
import { useGlassMode } from "../ui/useGlassMode";
import { useReduceMotion } from "../ui/useReduceMotion";
import { headerBandFace } from "./AppHeader";
import {
  HeaderScrollContext,
  isScrolled,
  SCROLLED_AFTER,
  useHeaderScroll,
} from "./headerScroll";
import { type ShellPage, TabShell } from "./TabShell";

// The header that turns to glass when the page scrolls (TASK-469 A5b,
// ADR-0383, «Capsula»): the page's colour at the top, glass once the page on
// screen has scrolled, back when it is at the top again or another page
// at its top is on screen.

jest.mock("../ui/useReduceMotion", () => ({ useReduceMotion: jest.fn() }));
jest.mock("../ui/useGlassMode", () => ({
  ...jest.requireActual("../ui/useGlassMode"),
  useGlassMode: jest.fn(),
}));

type Shadow = { inset?: boolean; offsetY?: number; color?: string };
type Face = ViewStyle & { boxShadow?: Shadow[] };

beforeEach(() => {
  // Still: the band changes at once, as with «Reduce Motion».
  jest.mocked(useReduceMotion).mockReturnValue(true);
  jest.mocked(useGlassMode).mockReturnValue("glass");
});

function scrollTo(y: number) {
  return { nativeEvent: { contentOffset: { x: 0, y } } };
}

function bandOpacity(): number {
  const style = StyleSheet.flatten(screen.getByTestId("header-band").props.style);
  return style.opacity as number;
}

test("scrolled only past a few points, so a touch's bounce leaves the header at rest", () => {
  expect(isScrolled(0)).toBe(false);
  expect(isScrolled(SCROLLED_AFTER)).toBe(false);
  expect(isScrolled(SCROLLED_AFTER + 1)).toBe(true);
  // Pulled down past the top: at rest.
  expect(isScrolled(-40)).toBe(false);
});

function Scroller() {
  return <ScrollView testID="scroller" {...useHeaderScroll()} />;
}

test("a page tells the header only when it leaves the top and when it is back", async () => {
  const report = jest.fn();
  await render(
    <HeaderScrollContext.Provider value={report}>
      <Scroller />
    </HeaderScrollContext.Provider>,
  );
  const scroller = screen.getByTestId("scroller");
  expect(scroller.props.scrollEventThrottle).toBe(16);
  await fireEvent.scroll(scroller, scrollTo(2));
  expect(report).not.toHaveBeenCalled();
  await fireEvent.scroll(scroller, scrollTo(30));
  await fireEvent.scroll(scroller, scrollTo(300));
  expect(report.mock.calls).toEqual([[true]]);
  await fireEvent.scroll(scroller, scrollTo(0));
  expect(report.mock.calls).toEqual([[true], [false]]);
});

test("outside the tab shell a scroller tells nobody", async () => {
  await render(<Scroller />);
  await fireEvent.scroll(screen.getByTestId("scroller"), scrollTo(300));
  expect(screen.getByTestId("scroller")).toBeOnTheScreen();
});

test("on glass: the veil, the edge of light at the bottom, a short shadow on the page", () => {
  const face = headerBandFace("glass") as Face;
  expect(face.backgroundColor).toBe(glass.fill);
  const [edge, shadow] = face.boxShadow ?? [];
  expect(edge).toMatchObject({ inset: true, offsetY: -1, color: glass.rim });
  expect(shadow).toMatchObject({ offsetY: 2, color: glass.shadow });
  expect(shadow.inset).toBeUndefined();
});

test("«Reduce Transparency»: opaque, with the thin line of a division", () => {
  const face = headerBandFace("solid") as Face;
  expect(face.backgroundColor).toBe(color.background);
  expect(face.borderBottomWidth).toBe(StyleSheet.hairlineWidth);
  expect(face.borderBottomColor).toBe(color.hairline);
  expect(face.boxShadow).toBeUndefined();
});

test("«Increase Contrast»: opaque, with the strong edge", () => {
  const face = headerBandFace("contrast") as Face;
  expect(face.backgroundColor).toBe(color.background);
  expect(face.borderBottomWidth).toBe(1);
  expect(face.borderBottomColor).toBe(color.borderStrong);
});

function Page({ name }: { name: string }) {
  return (
    <ScrollView testID={`${name}-scroller`} {...useHeaderScroll()}>
      <Text>{name}</Text>
    </ScrollView>
  );
}

function Shell() {
  const [page, setPage] = useState(0);
  const pages: ShellPage[] = [
    { title: "Feed", label: "Feed", icon: "house", render: () => <Page name="Feed" /> },
    {
      title: "Draw",
      label: "Draw",
      icon: "pencil",
      render: () => <Page name="Draw" />,
    },
  ];
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <TabShell pages={pages} page={page} onPage={setPage} />
    </SafeAreaProvider>
  );
}

test("the band follows the page on screen: glass once it scrolls, at rest at its top", async () => {
  await render(<Shell />);
  expect(bandOpacity()).toBe(0);
  await fireEvent.scroll(screen.getByTestId("Feed-scroller"), scrollTo(200));
  expect(bandOpacity()).toBe(1);
  // Another page, at its top: at rest; back to the scrolled one: glass.
  await fireEvent.press(screen.getByRole("tab", { name: "Draw" }));
  expect(bandOpacity()).toBe(0);
  await fireEvent.press(screen.getByRole("tab", { name: "Feed" }));
  expect(bandOpacity()).toBe(1);
  await fireEvent.scroll(
    screen.getByTestId("Feed-scroller", { includeHiddenElements: true }),
    scrollTo(0),
  );
  expect(bandOpacity()).toBe(0);
});

test("the band is never in the way of a touch, nor read", async () => {
  await render(<Shell />);
  const band = screen.getByTestId("header-band");
  expect(band.props.pointerEvents).toBe("none");
  expect(band.props.accessible).toBeFalsy();
});
