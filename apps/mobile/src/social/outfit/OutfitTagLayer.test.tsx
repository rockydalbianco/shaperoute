/**
 * The items a member tagged on a photo, as the others and its author see
 * them (TASK-394 part B): a hanger, the dots it shows and hides, the sheet
 * with «Shop on {store}», the line under it and «Report»; the counts and
 * the totals to the author only, whose own touches are not counted.
 */
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { DrawingPhoto, OutfitTag, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Linking } from "react-native";

import type { AccountState } from "../../account/useAccount";
import { FollowsContext } from "../followsDoor";
import { OutfitTagLayer, OutfitTotals } from "./OutfitTagLayer";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const API = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const AUTHOR = { public_id: "u_anna", username: "anna" };

const SHOES: OutfitTag = {
  id: "t1",
  x: 0.5,
  y: 0.8,
  item: "shoes",
  brand: "Nike",
  product_name: "Pegasus 41",
  store: "nike.com",
  url: null,
  hidden: false,
  opens: null,
  shops: null,
};
const CAP: OutfitTag = {
  ...SHOES,
  id: "t2",
  y: 0.1,
  item: "cap",
  brand: "Ciele",
  store: null,
};
const photo = (tags: OutfitTag[]): DrawingPhoto => ({
  n: 1,
  url: "/drawings/d1/photos/1?v=1",
  width: 800,
  height: 1000,
  outfit_tags: tags,
});
const MINE: OutfitTag = {
  ...SHOES,
  url: "https://www.nike.com/p",
  opens: 15,
  shops: 3,
};

let fetchSpy: jest.SpiedFunction<typeof fetch>;
let shopUrl: string | null = "https://www.nike.com/p";

function Around({ children }: { children: ReactNode }) {
  return (
    <FollowsContext.Provider
      value={{
        apiUrl: API,
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      {children}
    </FollowsContext.Provider>
  );
}

beforeEach(() => {
  shopUrl = "https://www.nike.com/p";
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    if (String(input).endsWith("/shop")) {
      return Response.json({ url: shopUrl });
    }
    return new Response(null, { status: 204 });
  });
});

afterEach(() => fetchSpy.mockRestore());

function posted(): string[] {
  return fetchSpy.mock.calls.map(([url]) => String(url).replace(API, ""));
}

async function show(
  tags: OutfitTag[],
  toggle: "hanger" | "photo" = "hanger",
  openUrl?: jest.Mock,
) {
  await render(
    <OutfitTagLayer
      photo={photo(tags)}
      fit="contain"
      toggle={toggle}
      author={AUTHOR}
    />,
    { wrapper: Around },
  );
  // The box the photo fills: 400 × 500, a photo of 800 × 1000.
  await act(() =>
    fireEvent(screen.getByTestId("outfit-layer"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 500 } },
    }),
  );
  return openUrl;
}

test("nothing on a photo without items", async () => {
  await render(
    <OutfitTagLayer photo={photo([])} fit="cover" toggle="hanger" author={AUTHOR} />,
    { wrapper: Around },
  );
  expect(screen.queryByTestId("outfit-hanger")).toBeNull();
});

test("the hanger says how many, and shows and hides the dots, each in its place", async () => {
  await show([SHOES, CAP]);
  expect(screen.getByRole("button", { name: "2 items tagged" })).toBeOnTheScreen();
  expect(screen.queryByTestId("outfit-tag-t1")).toBeNull();
  await fireEvent.press(screen.getByTestId("outfit-hanger"));
  const dot = screen.getByRole("button", { name: "Shoes, Nike" });
  expect(dot).toHaveStyle({ left: 200 - 22, top: 400 - 22 });
  expect(screen.getByRole("button", { name: "Cap, Ciele" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("outfit-hanger"));
  expect(screen.queryByTestId("outfit-tag-t1")).toBeNull();
  // Nothing is counted for the hanger.
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("on a drawing opened, a tap on the photo shows them too", async () => {
  await show([SHOES], "photo");
  await fireEvent.press(screen.getByTestId("outfit-photo-tap"));
  expect(screen.getByTestId("outfit-tag-t1")).toBeOnTheScreen();
});

test("a dot opens its sheet: counted, «Shop» counted and opened in the browser", async () => {
  await show([SHOES]);
  await fireEvent.press(screen.getByTestId("outfit-hanger"));
  await fireEvent.press(screen.getByTestId("outfit-tag-t1"));
  expect(screen.getByText("Shoes")).toBeOnTheScreen();
  expect(screen.getByText("Nike")).toBeOnTheScreen();
  expect(screen.getByText("Pegasus 41")).toBeOnTheScreen();
  expect(
    screen.getByText(
      "Link added by anna. MuW doesn't check the products or the shops.",
    ),
  ).toBeOnTheScreen();
  // Nothing of Style's: no price, no AI, no ad.
  expect(screen.queryByText(/AI|Ad ·|commission/)).toBeNull();
  // The others can report it, not see its numbers.
  expect(screen.getByTestId("report-menu")).toBeOnTheScreen();
  expect(screen.queryByTestId("outfit-counts")).toBeNull();
  await waitFor(() => expect(posted()).toEqual(["/outfit-tags/t1/open"]));
  const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  await fireEvent.press(screen.getByRole("link", { name: "Shop on nike.com" }));
  await waitFor(() => expect(openURL).toHaveBeenCalledWith("https://www.nike.com/p"));
  expect(posted()).toEqual(["/outfit-tags/t1/open", "/outfit-tags/t1/shop"]);
  expect(
    (fetchSpy.mock.calls[1][1]?.headers as Record<string, string>).Authorization,
  ).toBe(`Bearer ${(session as Session).token}`);
  openURL.mockRestore();
});

test("a link MuW cannot open any more says so", async () => {
  shopUrl = null;
  await show([SHOES]);
  await fireEvent.press(screen.getByTestId("outfit-hanger"));
  await fireEvent.press(screen.getByTestId("outfit-tag-t1"));
  await fireEvent.press(screen.getByTestId("outfit-shop"));
  expect(await screen.findByText("This link isn't available.")).toBeOnTheScreen();
});

test("an item without a link has no «Shop» and no line", async () => {
  await show([CAP]);
  await fireEvent.press(screen.getByTestId("outfit-hanger"));
  await fireEvent.press(screen.getByTestId("outfit-tag-t2"));
  expect(screen.getByText("Ciele")).toBeOnTheScreen();
  expect(screen.queryByTestId("outfit-shop")).toBeNull();
  expect(screen.queryByText(/Link added by/)).toBeNull();
});

test("the author sees its numbers, opens its own link, and nothing is counted", async () => {
  const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  await show([MINE]);
  await fireEvent.press(screen.getByTestId("outfit-hanger"));
  await fireEvent.press(screen.getByTestId("outfit-tag-t1"));
  expect(screen.getByText("Opens: 15 · To the shop: 3")).toBeOnTheScreen();
  expect(screen.getByText("Only you see these numbers.")).toBeOnTheScreen();
  expect(screen.queryByTestId("report-menu")).toBeNull();
  await fireEvent.press(screen.getByTestId("outfit-shop"));
  await waitFor(() => expect(openURL).toHaveBeenCalledWith("https://www.nike.com/p"));
  expect(fetchSpy).not.toHaveBeenCalled();
  openURL.mockRestore();
});

test("under the photos, the totals to the author only", async () => {
  await render(
    <OutfitTotals
      photos={[photo([MINE, { ...MINE, id: "t3", opens: 5, shops: 0 }])]}
    />,
  );
  expect(screen.getByText("Your items · Opens: 20 · To the shop: 3")).toBeOnTheScreen();
  expect(screen.getByText("Only you see these numbers.")).toBeOnTheScreen();
  await screen.unmount();
  await render(<OutfitTotals photos={[photo([SHOES])]} />);
  expect(screen.queryByTestId("outfit-totals")).toBeNull();
});
