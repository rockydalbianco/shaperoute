import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { type StyleProp, StyleSheet, type ViewStyle } from "react-native";

import type { Account } from "../account/useAccount";
import { SettingsPage } from "../profile/SettingsPage";
import { BlockedPeople } from "../social/BlockedPeople";
import { FollowsContext } from "../social/followsDoor";
import { color, radius } from "../theme/tokens";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";
import { settingsGroupFace } from "./settingsGroup";

// The rest of «Settings» in the glass look (TASK-469 A6b, ADR-0383,
// «Capsula»): the account card and the row of «Blocked people» wear the face
// of the groups; the box that asks before «Delete account» takes their
// corners and keeps its red edge, a warning and not glass.

jest.mock("expo-notifications");
jest.mock("../ui/useGlassMode", () => ({
  ...jest.requireActual("../ui/useGlassMode"),
  useGlassMode: jest.fn(),
}));

const signedIn = session as Session;

type Shadow = { inset?: boolean; color?: string };
type Face = ViewStyle & { boxShadow?: Shadow[] };

/** The rendered tree as JSON, and every node in it `where` says. */
type Json = {
  type: string;
  props: Record<string, unknown>;
  children: (Json | string)[] | null;
};
function nodes(
  node: Json | string | null | undefined,
  where: (node: Json) => boolean,
): Json[] {
  if (node == null || typeof node === "string") {
    return [];
  }
  const own = where(node) ? [node] : [];
  return [...own, ...(node.children ?? []).flatMap((child) => nodes(child, where))];
}

function face(node: Json): Face {
  return (StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>) ?? {}) as Face;
}

/** The text directly inside a node. */
function says(node: Json, text: string): boolean {
  return (node.children ?? []).some(
    (child) =>
      typeof child !== "string" &&
      child.type === "Text" &&
      (child.children ?? []).includes(text),
  );
}

function tree(): Json | null {
  return screen.toJSON() as unknown as Json | null;
}

function account(): Account {
  return {
    state: { status: "signedIn", session: signedIn },
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

async function showSettings() {
  await render(
    <SettingsPage
      user={signedIn.user}
      account={account()}
      onAbout={jest.fn()}
      feedbackApi={{ baseUrl: null }}
    />,
  );
}

describe.each(["glass", "solid", "contrast"] as const)("%s", (mode: GlassMode) => {
  beforeEach(() => {
    jest.mocked(useGlassMode).mockReturnValue(mode);
  });

  test("the account card wears the group's face", async () => {
    await showSettings();
    const [card, ...more] = nodes(
      tree(),
      (node) => node.type === "View" && says(node, signedIn.user.username),
    );
    expect(more).toHaveLength(0);
    const style = face(card);
    expect(style.borderRadius).toBe(radius.group);
    expect(style.backgroundColor).toBe(color.surface);
    expect(style.borderWidth).toBe(0);
    expect(style.boxShadow).toEqual(settingsGroupFace(mode).boxShadow);
  });

  test("the box before «Delete account»: the group's corners, the red edge", async () => {
    await showSettings();
    await fireEvent.press(screen.getByRole("button", { name: "Delete account" }));
    const [box, ...more] = nodes(
      tree(),
      (node) => node.type === "View" && face(node).borderColor === color.error,
    ).filter((node) => face(node).borderRadius === radius.group);
    expect(more).toHaveLength(0);
    expect(face(box).borderWidth).toBe(1);
    expect(face(box).backgroundColor).toBe(color.surface);
  });

  test("the row of «Blocked people» wears the group's face", async () => {
    await render(
      <FollowsContext.Provider
        value={{
          apiUrl: "http://api",
          account: {
            state: { status: "signedIn", session: signedIn },
            sessionEnded: jest.fn(),
          },
          openProfile: jest.fn(),
        }}
      >
        <BlockedPeople fetchFn={jest.fn()} apiKey={null} />
      </FollowsContext.Provider>,
    );
    const [row] = nodes(tree(), (node) => node.props.testID === "blocked-people");
    const style = face(row);
    expect(style.borderRadius).toBe(radius.group);
    expect(style.backgroundColor).toBe(color.surface);
    expect(style.borderWidth).toBe(0);
    expect(style.boxShadow).toEqual(settingsGroupFace(mode).boxShadow);
  });
});
