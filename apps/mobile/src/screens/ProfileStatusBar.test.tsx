import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { Account } from "../account/useAccount";
import { HeaderScrollContext } from "../tabs/headerScroll";
import { TabBarRoomContext } from "../tabs/tabBarRoom";
import { color, space } from "../theme/tokens";
import { ProfileScreen } from "./ProfileScreen";

// «Settings» scrolled with its text under the clock (TASK-508): a page of
// «Profile» opened over the app has nothing on the status bar. A band of
// the page's colour stands there; as a tab the header does already.

const TOP = 47;

function account(state: Account["state"]): Account {
  return {
    state,
    busy: null,
    problem: null,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    editProfile: jest.fn(),
    changeEmail: jest.fn(),
    changePhone: jest.fn(),
    changeNotifications: jest.fn(),
    clearProblem: jest.fn(),
    sessionEnded: jest.fn(),
  };
}

function onPhone(children: ReactNode) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: TOP, left: 0, right: 0, bottom: 34 },
      }}
    >
      {children}
    </SafeAreaProvider>
  );
}

function settings() {
  return (
    <ProfileScreen
      account={account({ status: "signedIn", session: session as Session })}
      page="settings"
      onPage={jest.fn()}
      hint={null}
      onBack={jest.fn()}
    />
  );
}

function cover() {
  return screen.queryByTestId("status-bar-cover", { includeHiddenElements: true });
}

test("over the app, the status bar is covered in the page's colour", async () => {
  await render(onPhone(settings()));
  expect(screen.getByRole("header", { name: "Settings" })).toBeOnTheScreen();
  const band = cover();
  expect(band).not.toBeNull();
  const style = StyleSheet.flatten(band?.props.style) as ViewStyle;
  expect(style.height).toBe(TOP);
  expect(style.backgroundColor).toBe(color.background);
});

test("signed out over the app too: «Log in» scrolls under the same band", async () => {
  await render(
    onPhone(
      <ProfileScreen
        account={account({ status: "signedOut", notice: null })}
        page="account"
        onPage={jest.fn()}
        hint={null}
        onBack={jest.fn()}
      />,
    ),
  );
  expect(cover()).not.toBeNull();
});

test("as a page of the tab bar there is no band: the header is there", async () => {
  await render(
    onPhone(
      <HeaderScrollContext.Provider value={jest.fn()}>
        {settings()}
      </HeaderScrollContext.Provider>,
    ),
  );
  expect(cover()).toBeNull();
});

test("the page ends above the tab bar's room (TASK-469 part B)", async () => {
  const ROOM = 80;
  await render(
    onPhone(
      <TabBarRoomContext.Provider value={ROOM}>
        {settings()}
      </TabBarRoomContext.Provider>,
    ),
  );
  // The content of the page's scroller, wherever it is laid out.
  type Node = {
    props: { style?: unknown; contentContainerStyle?: unknown };
    children: (Node | string)[] | null;
  };
  const bottoms: number[] = [];
  const walk = (node: Node | string | (Node | string)[] | null) => {
    if (node === null || typeof node === "string") {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    for (const each of [node.props.style, node.props.contentContainerStyle]) {
      const style = StyleSheet.flatten(each as ViewStyle) as ViewStyle | undefined;
      if (typeof style?.paddingBottom === "number") {
        bottoms.push(style.paddingBottom);
      }
    }
    (node.children ?? []).forEach(walk);
  };
  walk(screen.toJSON() as unknown as Node);
  const bottom = Math.max(...bottoms);
  expect(bottom).toBe(34 + space.xl + ROOM);
});
