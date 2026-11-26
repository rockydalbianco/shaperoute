import list from "@shaperoute/shared-types/fixtures/gear-list.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Gear, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { answers } from "../account/testing";
import { FollowsContext } from "../social/followsDoor";
import { GearTagChoice, outfitItemOf, tagOfGear } from "./GearTagChoice";

// «From my gear» in the form of a tagged item (TASK-486 part F, ADR-0393).

const [SHOES, HELMET] = list.gear as Gear[];

async function show(
  fetchFn: jest.Mock,
  { chosen = null, on = true }: { chosen?: string | null; on?: boolean } = {},
) {
  const onChoose = jest.fn();
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: "http://api",
        account: {
          state: { status: "signedIn", session: session as Session },
          sessionEnded: jest.fn(),
        },
        openProfile: () => {},
      }}
    >
      <GearTagChoice
        chosen={chosen}
        onChoose={onChoose}
        api={{ fetchFn, key: null }}
        on={on}
      />
    </FollowsContext.Provider>,
  );
  return onChoose;
}

test("a photo's kind of each kind of gear", () => {
  expect(outfitItemOf("shoes")).toBe("shoes");
  expect(outfitItemOf("climbing_shoes")).toBe("shoes");
  expect(outfitItemOf("ski_boots")).toBe("shoes");
  expect(outfitItemOf("boots")).toBe("shoes");
  expect(outfitItemOf("backpack")).toBe("backpack");
  expect(outfitItemOf("watch")).toBe("watch");
  expect(outfitItemOf("helmet")).toBe("other");
  expect(outfitItemOf("bike")).toBe("other");
  expect(outfitItemOf("a kind of a newer API")).toBe("other");
});

test("an item gives the tag its kind, brand, model and id", () => {
  expect(tagOfGear(SHOES as Gear)).toEqual({
    item: "shoes",
    brand: "Nike",
    model: "Pegasus 41",
    gearId: SHOES?.id,
  });
  expect(tagOfGear(HELMET as Gear)).toMatchObject({ brand: "Petzl", model: "" });
});

test("off, nothing is asked and nothing shown", async () => {
  const fetchFn: jest.Mock = answers();
  await show(fetchFn, { on: false });
  expect(screen.queryByTestId("gear-tag-choice")).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("without items nothing is shown", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: { gear: [] } });
  await show(fetchFn);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("gear-tag-choice")).toBeNull();
});

test("the items in use are chips; a retired one only when it is the tag's", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  await show(fetchFn);
  expect(await screen.findByText("From my gear")).toBeOnTheScreen();
  expect(screen.getByText("👟 The red ones")).toBeOnTheScreen();
  expect(screen.queryByTestId(`gear-tag-${HELMET?.id}`)).toBeNull();
});

test("a retired item the tag already is stays, chosen", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  await show(fetchFn, { chosen: HELMET?.id });
  const chip = await screen.findByTestId(`gear-tag-${HELMET?.id}`);
  expect(chip).toBeSelected();
});

test("a touch chooses an item", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  const onChoose = await show(fetchFn);
  await fireEvent.press(await screen.findByTestId(`gear-tag-${SHOES?.id}`));
  expect(onChoose).toHaveBeenLastCalledWith(SHOES);
});

test("the chosen item touched again is let go", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  const onChoose = await show(fetchFn, { chosen: SHOES?.id });
  await fireEvent.press(await screen.findByTestId(`gear-tag-${SHOES?.id}`));
  expect(onChoose).toHaveBeenLastCalledWith(null);
});
