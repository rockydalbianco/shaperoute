import drawing from "@shaperoute/shared-types/fixtures/drawing.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { DrawingDetail, OutfitTag, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { AccountState } from "../account/useAccount";
import { DrawingCard } from "./DrawingCard";
import { DrawingsContext, useDrawingsDoor } from "./drawingsDoor";
import { FollowsContext } from "./followsDoor";

// The items worn on the photos of a drawing opened (TASK-394 part B): a tap
// on the photo shows them, as the hanger does; the totals to the author.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const signedIn: AccountState = { status: "signedIn", session: session as Session };
const SHOES: OutfitTag = {
  id: "t1",
  x: 0.5,
  y: 0.5,
  item: "shoes",
  brand: "Nike",
  product_name: null,
  store: null,
  url: null,
  hidden: false,
  opens: null,
  shops: null,
};
const withTags = (tags: OutfitTag[]): DrawingDetail => ({
  ...(drawing as DrawingDetail),
  photos: [
    {
      n: 1,
      url: "/drawings/d/photos/1?v=1",
      width: 800,
      height: 1000,
      outfit_tags: tags,
    },
  ],
});

function Around({ children }: { children: ReactNode }) {
  const nothing = useDrawingsDoor();
  return (
    <FollowsContext.Provider
      value={{
        apiUrl: "http://api",
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <DrawingsContext.Provider
        value={{
          ...nothing,
          photoSource: (photo) => ({ uri: `http://api${photo.url}` }),
        }}
      >
        {children}
      </DrawingsContext.Provider>
    </FollowsContext.Provider>
  );
}

test("a tap on the photo shows its items, each in its place", async () => {
  await render(<DrawingCard drawing={withTags([SHOES])} onBack={jest.fn()} />, {
    wrapper: Around,
  });
  expect(screen.getByRole("button", { name: "1 item tagged" })).toBeOnTheScreen();
  // 160 high, 128 wide: the photo whole.
  await act(() =>
    fireEvent(screen.getByTestId("outfit-layer"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 128, height: 160 } },
    }),
  );
  await fireEvent.press(screen.getByTestId("outfit-photo-tap"));
  expect(screen.getByRole("button", { name: "Shoes, Nike" })).toHaveStyle({
    left: 64 - 22,
    top: 80 - 22,
  });
  expect(screen.queryByTestId("outfit-totals")).toBeNull();
});

test("the author sees the totals under the photos", async () => {
  await render(
    <DrawingCard
      drawing={withTags([{ ...SHOES, opens: 4, shops: 1 }])}
      onBack={jest.fn()}
    />,
    { wrapper: Around },
  );
  expect(screen.getByText("Your items · Opens: 4 · To the shop: 1")).toBeOnTheScreen();
});
