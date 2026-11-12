import { act, render } from "@testing-library/react-native";
import { useEffect } from "react";

import {
  TabReselect,
  TabReselectContext,
  useScrollToTopOnReselect,
} from "./tabReselect";

// The tab on screen touched again takes its list back to the top (TASK-367).
// In «Feed» the lists «All», «Following» and «Style» are built side by side,
// one shown: the hidden ones keep their place (UI.md), and they once went
// back to the top too (TASK-470, bug 5).

type Scroll = { scrollToOffset: jest.Mock };

function List({ shown, scroll }: { shown: boolean; scroll: Scroll }) {
  const ref = useScrollToTopOnReselect<Scroll>(shown);
  useEffect(() => {
    ref.current = scroll;
  });
  return null;
}

function Page({
  tab,
  all,
  following,
}: {
  tab: "all" | "following";
  all: Scroll;
  following: Scroll;
}) {
  return (
    <>
      <List shown={tab === "all"} scroll={all} />
      <List shown={tab === "following"} scroll={following} />
    </>
  );
}

test("only the list on screen goes back to its top; the hidden one keeps its place", async () => {
  const reselect = new TabReselect();
  const all = { scrollToOffset: jest.fn() };
  const following = { scrollToOffset: jest.fn() };
  const view = await render(
    <TabReselectContext.Provider value={reselect}>
      <Page tab="following" all={all} following={following} />
    </TabReselectContext.Provider>,
  );
  await act(() => reselect.reselect());
  expect(following.scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
  expect(all.scrollToOffset).not.toHaveBeenCalled();

  await view.rerender(
    <TabReselectContext.Provider value={reselect}>
      <Page tab="all" all={all} following={following} />
    </TabReselectContext.Provider>,
  );
  await act(() => reselect.reselect());
  expect(all.scrollToOffset).toHaveBeenCalledTimes(1);
  expect(following.scrollToOffset).toHaveBeenCalledTimes(1);
});

test("a single list, as on the other pages, goes back as before", async () => {
  const reselect = new TabReselect();
  const only = { scrollToOffset: jest.fn() };
  function One() {
    const ref = useScrollToTopOnReselect<Scroll>();
    useEffect(() => {
      ref.current = only;
    });
    return null;
  }
  await render(
    <TabReselectContext.Provider value={reselect}>
      <One />
    </TabReselectContext.Provider>,
  );
  await act(() => reselect.reselect());
  expect(only.scrollToOffset).toHaveBeenCalledTimes(1);
});
