import session from "@shaperoute/shared-types/fixtures/session.json";
import type { PeoplePage, Session } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle } from "react-native";

import type { AccountState } from "../account/useAccount";
import { saveLanguageChoice } from "../i18n/language";
import { FollowLists } from "./FollowLists";
import { FollowsContext } from "./followsDoor";

// The names under the three numbers of «Profile» (TASK-508): «Follower»
// came out «Follow…» on the phone. A name as wide as its own words was
// placed on whole pixels a hair narrower and cut; now it is as wide as its
// tile, and a longer word of another language gets smaller instead.

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const EMPTY: PeoplePage = { people: [], next: null, total: 0 };

async function show() {
  const fetchFn = jest.fn(async () => Response.json(EMPTY)) as unknown as jest.Mock;
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <FollowLists fetchFn={fetchFn} apiKey={null} />
    </FollowsContext.Provider>,
  );
  await screen.findByRole("button", { name: /, 0$/ }).catch(() => undefined);
}

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

const LISTS = ["requests", "followers", "following"] as const;

test("each name is as wide as its tile, centred, on one line", async () => {
  await show();
  for (const list of LISTS) {
    const name = screen.getByTestId(`follow-count-name-${list}`);
    const style = StyleSheet.flatten(name.props.style) as TextStyle;
    expect(style.alignSelf).toBe("stretch");
    expect(style.textAlign).toBe("center");
    expect(name.props.numberOfLines).toBe(1);
  }
});

test("a word too long for the tile gets smaller, down to a size still read", async () => {
  await show();
  for (const list of LISTS) {
    const name = screen.getByTestId(`follow-count-name-${list}`);
    expect(name.props.adjustsFontSizeToFit).toBe(true);
    expect(name.props.minimumFontScale).toBeGreaterThanOrEqual(0.8);
  }
});

test.each([
  ["it", ["Richieste", "Follower", "Segui già"]],
  ["de", ["Anfragen", "Follower", "Folge ich"]],
  ["fr", ["Demandes", "Abonnés", "Suivis"]],
  ["es", ["Solicitudes", "Seguidores", "Siguiendo"]],
] as const)("in «%s» the three names are whole", async (language, names) => {
  await act(async () => saveLanguageChoice(language));
  await show();
  LISTS.forEach((list, at) => {
    expect(screen.getByTestId(`follow-count-name-${list}`)).toHaveTextContent(
      names[at],
    );
  });
});
