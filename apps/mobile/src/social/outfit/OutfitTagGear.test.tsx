/**
 * A tagged item from one's own gear (TASK-486 part F, ADR-0393): in the
 * form, «From my gear» fills the item, the brand and the model, and the tag
 * keeps the item; in the sheet of its dot, a line opens the item, and
 * «Shop» stays as it is.
 */
import item from "@shaperoute/shared-types/fixtures/gear.json";
import list from "@shaperoute/shared-types/fixtures/gear-list.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { OutfitTag, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { FollowsContext } from "../followsDoor";
import { OutfitTagEditor } from "./OutfitTagEditor";
import { OutfitTagSheet } from "./OutfitTagSheet";

jest.mock("../../gear/gearOn", () => ({ GEAR_ON: true }));
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const API = "http://api";
const ANNA = { public_id: "u_anna", username: "anna" };

let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const body = url.endsWith("/me/gear")
      ? list
      : url.endsWith(`/gear/${item.id}`)
        ? item
        : {};
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
});

afterEach(() => {
  fetchSpy.mockRestore();
});

function Around({ children }: { children: ReactNode }) {
  return (
    <FollowsContext.Provider
      value={{
        apiUrl: API,
        account: {
          state: { status: "signedIn", session: session as Session },
          sessionEnded: jest.fn(),
        },
        openProfile: jest.fn(),
      }}
    >
      {children}
    </FollowsContext.Provider>
  );
}

test("an item of one's gear fills the form, and the tag keeps it", async () => {
  const onDone = jest.fn();
  await render(
    <Around>
      <OutfitTagEditor
        source={{ uri: "data:image/jpeg;base64,P1" }}
        tags={[]}
        elsewhere={0}
        brands={[]}
        refused={null}
        onDone={onDone}
      />
    </Around>,
  );
  await fireEvent.press(screen.getByTestId("outfit-photo"), {
    nativeEvent: { locationX: 100, locationY: 100 },
  });
  await fireEvent.press(await screen.findByTestId(`gear-tag-${item.id}`));
  expect(screen.getByTestId("outfit-brand")).toHaveDisplayValue("Nike");
  expect(screen.getByTestId("outfit-model")).toHaveDisplayValue("Pegasus 41");
  expect(screen.getByRole("radio", { name: "Shoes" })).toBeChecked();
  await fireEvent.press(screen.getByTestId("outfit-add"));
  await fireEvent.press(screen.getByTestId("outfit-editor-done"));
  await waitFor(() => expect(onDone).toHaveBeenCalled());
  expect(onDone.mock.calls[0][0]).toEqual([
    expect.objectContaining({ item: "shoes", brand: "Nike", gear_id: item.id }),
  ]);
});

test("an item written by hand does not say any gear", async () => {
  const onDone = jest.fn();
  await render(
    <Around>
      <OutfitTagEditor
        source={{ uri: "data:image/jpeg;base64,P1" }}
        tags={[]}
        elsewhere={0}
        brands={[]}
        refused={null}
        onDone={onDone}
      />
    </Around>,
  );
  await fireEvent.press(screen.getByTestId("outfit-photo"), {
    nativeEvent: { locationX: 100, locationY: 100 },
  });
  await fireEvent.changeText(screen.getByTestId("outfit-brand"), "Asics");
  await fireEvent.press(screen.getByTestId("outfit-add"));
  await fireEvent.press(screen.getByTestId("outfit-editor-done"));
  await waitFor(() => expect(onDone).toHaveBeenCalled());
  expect(onDone.mock.calls[0][0][0]).not.toHaveProperty("gear_id");
});

const TAG: OutfitTag = {
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

async function sheet(tag: OutfitTag) {
  await render(
    <OutfitTagSheet
      tag={tag}
      author={ANNA}
      apiUrl={API}
      token={session.token}
      onSessionEnded={jest.fn()}
      onClose={jest.fn()}
    />,
  );
}

test("the dot of an item of gear opens it, and «Shop» stays", async () => {
  await sheet({ ...TAG, gear_id: item.id });
  await fireEvent.press(await screen.findByTestId("tag-gear-line"));
  expect(await screen.findByTestId("gear-sheet")).toBeOnTheScreen();
  expect(screen.getByTestId("outfit-shop")).toBeOnTheScreen();
});

test("the dot of an item without gear asks for none", async () => {
  await sheet(TAG);
  expect(screen.getByTestId("outfit-shop")).toBeOnTheScreen();
  expect(screen.queryByTestId("tag-gear")).toBeNull();
  const asked = fetchSpy.mock.calls.map(([input]) => String(input));
  expect(asked.some((url) => url.includes("/gear/"))).toBe(false);
});
