import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { ScrollView } from "react-native";

import type { Account } from "../account/useAccount";
import { ProfileScreen } from "../screens/ProfileScreen";
import { FollowsContext } from "../social/followsDoor";
import { SkiDaysPage } from "../skimode/SkiDaysPage";
import { SkiTodayPage } from "../skimode/SkiTodayPage";
import { HeaderScrollContext, useHeaderScroll } from "./headerScroll";

// The other pages of the tab bar tell the header their scroll too (TASK-469
// A5c, ADR-0383): «Profile», and «Today» and «Days» of the ski mode. A
// page that goes while away from its top leaves the header at rest.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

function scrollTo(y: number) {
  return { nativeEvent: { contentOffset: { x: 0, y } } };
}

function told(children: ReactNode, report: jest.Mock) {
  return (
    <HeaderScrollContext.Provider value={report}>
      {children}
    </HeaderScrollContext.Provider>
  );
}

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

test("«Profile» tells the header when it leaves the top and when it is back", async () => {
  const report = jest.fn();
  await render(
    told(
      <ProfileScreen
        account={account({ status: "signedIn", session: session as Session })}
        page="settings"
        onPage={jest.fn()}
        hint={null}
        onBack={jest.fn()}
      />,
      report,
    ),
  );
  // Anything inside the page: the scroll reaches its scroller.
  const inside = screen.getByRole("header", { name: "Settings" });
  await fireEvent.scroll(inside, scrollTo(200));
  expect(report.mock.calls).toEqual([[true]]);
  await fireEvent.scroll(inside, scrollTo(0));
  expect(report.mock.calls).toEqual([[true], [false]]);
});

test("«Today» of the ski mode tells the header", async () => {
  const report = jest.fn();
  await render(told(<SkiTodayPage onRecord={jest.fn()} resort={null} />, report));
  await fireEvent.scroll(screen.getByRole("header", { name: "Today" }), scrollTo(120));
  expect(report).toHaveBeenCalledWith(true);
});

test("«Days» of the ski mode tells the header", async () => {
  const report = jest.fn();
  await render(
    told(
      <FollowsContext.Provider
        value={{
          apiUrl: "http://api",
          account: {
            state: { status: "signedOut", notice: null },
            sessionEnded: jest.fn(),
          },
          openProfile: jest.fn(),
        }}
      >
        <SkiDaysPage onLogIn={jest.fn()} />
      </FollowsContext.Provider>,
      report,
    ),
  );
  await fireEvent.scroll(screen.getByRole("header", { name: "Days" }), scrollTo(120));
  expect(report).toHaveBeenCalledWith(true);
});

function Scroller() {
  return <ScrollView testID="scroller" {...useHeaderScroll()} />;
}

test("a page that goes while scrolled leaves the header at rest", async () => {
  const report = jest.fn();
  const { unmount } = await render(told(<Scroller />, report));
  await fireEvent.scroll(screen.getByTestId("scroller"), scrollTo(300));
  expect(report.mock.calls).toEqual([[true]]);
  await unmount();
  expect(report.mock.calls).toEqual([[true], [false]]);
});

test("a page that goes at its top tells nothing more", async () => {
  const report = jest.fn();
  const { unmount } = await render(told(<Scroller />, report));
  await fireEvent.scroll(screen.getByTestId("scroller"), scrollTo(300));
  await fireEvent.scroll(screen.getByTestId("scroller"), scrollTo(0));
  await unmount();
  expect(report.mock.calls).toEqual([[true], [false]]);
});
