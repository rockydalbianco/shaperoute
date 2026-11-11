/**
 * «Your plan, step by step» (TASK-433 B, the user's choices of 2026-11-10):
 * up only the first time «Gym» is touched, never when the app opens with
 * the gym already chosen nor for another sport; «Not now» closes it for
 * good, «How plans work» shows it again, «Create my plan» opens the guide.
 */
import calendar from "@shaperoute/shared-types/fixtures/gym-calendar.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { saveSport } from "../settings/sport";
import { DrawingsContext, type DrawingsDoor } from "../social/drawingsDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { GymDrawGuide } from "./GymDrawGuide";
import { forgetGymIntro, INTRO_FILE } from "./gymIntro";
import { forgetPlans } from "./plans";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
// The sheet without its springs: up while visible, `onHidden` once down.
jest.mock("../ui/SheetModal", () => ({
  SheetModal: ({
    visible,
    onHidden,
    testID,
    children,
  }: {
    visible: boolean;
    onHidden?: () => void;
    testID?: string;
    children: ReactNode;
  }) => {
    const React = jest.requireActual<typeof import("react")>("react");
    const { View: MockView } =
      jest.requireActual<typeof import("react-native")>("react-native");
    const was = React.useRef(visible);
    React.useEffect(() => {
      if (was.current && !visible) {
        onHidden?.();
      }
      was.current = visible;
    }, [visible, onHidden]);
    return visible ? <MockView testID={testID}>{children}</MockView> : null;
  },
}));
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

function api() {
  return jest.fn(async (url: string) =>
    String(url).includes("/me/gym-calendar")
      ? Response.json(calendar)
      : Response.json({ plans: [] }),
  ) as unknown as typeof fetch;
}

async function shown(owner: number | null = 7) {
  await render(
    <FollowsContext.Provider
      value={
        {
          apiUrl: "http://api",
          account: {
            state: { status: "signedIn", session: session as Session },
            sessionEnded: () => {},
          },
          openProfile: () => {},
        } as unknown as FollowsDoor
      }
    >
      <ActivitiesContext.Provider
        value={{ owner, total: 3 } as unknown as ActivitiesDoor}
      >
        <DrawingsContext.Provider
          value={{ open: jest.fn() } as unknown as DrawingsDoor}
        >
          <GymDrawGuide fetchFn={api()} />
        </DrawingsContext.Provider>
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  files.clear();
  forgetGymIntro();
  forgetPlans();
});

test("the app opening with the gym chosen: no sheet", async () => {
  await shown();
  expect(screen.getByTestId("gym-guide")).toBeOnTheScreen();
  expect(screen.queryByTestId("gym-intro")).toBeNull();
});

test("«Gym» touched the first time: the sheet; «Not now» closes it for good", async () => {
  // Another sport: nothing.
  await act(async () => saveSport("bike"));
  await act(async () => saveSport("gym"));
  await shown();
  const sheet = screen.getByTestId("gym-intro");
  expect(
    screen.getByRole("header", { name: "Your plan, step by step" }),
  ).toBeOnTheScreen();
  expect(sheet).toHaveTextContent(/Choose your goal and days/);
  expect(sheet).toHaveTextContent(/The weeks change by themselves/);
  await fireEvent.press(screen.getByTestId("gym-intro-close"));
  expect(screen.queryByTestId("gym-intro")).toBeNull();
  expect(JSON.parse(files.get(`file:///documents/${INTRO_FILE}`) ?? "{}")).toEqual({
    seen: true,
  });
  await screen.unmount();

  // Touched again, even after the app opens again: no more.
  forgetGymIntro();
  await act(async () => saveSport("run"));
  await act(async () => saveSport("gym"));
  await shown();
  expect(screen.queryByTestId("gym-intro")).toBeNull();

  // «How plans work» shows it again.
  await fireEvent.press(screen.getByTestId("gym-guide-intro"));
  expect(screen.getByTestId("gym-intro")).toBeOnTheScreen();
});

test("«Create my plan» opens the guide once the sheet is down", async () => {
  await act(async () => saveSport("gym"));
  await shown();
  await fireEvent.press(screen.getByTestId("gym-intro-create"));
  await act(async () => {});
  expect(screen.queryByTestId("gym-intro")).toBeNull();
  expect(screen.getByTestId("plan-wizard")).toBeOnTheScreen();
  expect(screen.getByText("STEP 1 OF 5")).toBeOnTheScreen();
});

test("without an account, «Not now» only", async () => {
  await act(async () => saveSport("gym"));
  await shown(null);
  expect(screen.getByTestId("gym-intro")).toBeOnTheScreen();
  expect(screen.queryByTestId("gym-intro-create")).toBeNull();
});
