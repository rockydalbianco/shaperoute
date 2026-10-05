import { act, renderHook } from "@testing-library/react-native";
import type { NativeAd } from "react-native-google-mobile-ads";

import type { AdViews, FeedAds } from "./feedAds";
import { useFeedAds } from "./useFeedAds";

/** A native ad, for the hook: its name, and whether it was destroyed. */
type FakeAd = { name: string; destroyed: boolean; destroy(): void };

/** A stand-in ad network: each ad asked for waits until the test gives it. */
function fakeNetwork() {
  const asked: ((ad: NativeAd | null) => void)[] = [];
  const network: FeedAds & { asked: typeof asked } = {
    asked,
    views: {} as AdViews,
    load: () => new Promise<NativeAd | null>((resolve) => asked.push(resolve)),
  };
  return network;
}

function ad(name: string): FakeAd {
  const made = {
    name,
    destroyed: false,
    destroy: () => {
      made.destroyed = true;
    },
  };
  return made;
}

/** Gives the ad asked for `n`-th, and lets the hook take it. */
async function give(
  network: ReturnType<typeof fakeNetwork>,
  n: number,
  what: FakeAd | null,
) {
  await act(async () => {
    network.asked[n](what as unknown as NativeAd | null);
  });
}

const names = (ads: readonly (NativeAd | undefined)[]) =>
  ads.map((each) => (each as unknown as FakeAd | undefined)?.name);

test("asks for the first ad when the Feed is on the screen, not before", async () => {
  const network = fakeNetwork();
  const { result, rerender } = await renderHook(
    ({ active }: { active: boolean }) => useFeedAds(15, active, network),
    { initialProps: { active: false } },
  );
  // Built behind «Draw» at the start: no ad, no consent form.
  expect(network.asked).toHaveLength(0);

  await rerender({ active: true });
  expect(network.asked).toHaveLength(1);
  await give(network, 0, ad("A"));
  expect(names(result.current.ads)).toEqual(["A"]);
  // One at a time: the next waits for the user to come near its place.
  expect(network.asked).toHaveLength(1);
});

test("asks for the next ad when the user reaches the place of the one before", async () => {
  const network = fakeNetwork();
  const { result } = await renderHook(() => useFeedAds(15, true, network));
  await give(network, 0, ad("A"));

  await act(async () => result.current.see(4));
  expect(network.asked).toHaveLength(1);
  // The sixth post, under the first ad: the second ad (after the tenth) is near.
  await act(async () => result.current.see(5));
  expect(network.asked).toHaveLength(2);
  await give(network, 1, ad("B"));
  expect(names(result.current.ads)).toEqual(["A", "B"]);

  // 15 posts: two places, no more ads.
  await act(async () => result.current.see(14));
  expect(network.asked).toHaveLength(2);
});

test("a place whose ad does not come stays empty, and the next is tried", async () => {
  const network = fakeNetwork();
  const { result } = await renderHook(() => useFeedAds(15, true, network));
  await give(network, 0, null);
  expect(names(result.current.ads)).toEqual([]);
  // Not asked again for the same place.
  expect(network.asked).toHaveLength(1);

  await act(async () => result.current.see(5));
  expect(network.asked).toHaveLength(2);
  await give(network, 1, ad("B"));
  expect(names(result.current.ads)).toEqual([undefined, "B"]);
});

test("an ad that comes late goes to the next place the user has not reached", async () => {
  const network = fakeNetwork();
  const { result } = await renderHook(() => useFeedAds(15, true, network));
  // A quick scroll: the post under the first place is on the screen already.
  await act(async () => result.current.see(6));
  await give(network, 0, ad("A"));
  expect(names(result.current.ads)).toEqual([undefined, "A"]);
});

test("an ad that comes when every place is passed is not shown, and goes", async () => {
  const network = fakeNetwork();
  const { result } = await renderHook(() => useFeedAds(15, true, network));
  await act(async () => result.current.see(12));
  const late = ad("A");
  await give(network, 0, late);
  expect(names(result.current.ads)).toEqual([]);
  expect(late.destroyed).toBe(true);
});

test("few posts: no place, no ad asked for", async () => {
  const network = fakeNetwork();
  await renderHook(() => useFeedAds(5, true, network));
  expect(network.asked).toHaveLength(0);
});

test("when the Feed goes, its ads go, and one on its way too", async () => {
  const network = fakeNetwork();
  const { result, unmount } = await renderHook(() => useFeedAds(15, true, network));
  const shown = ad("A");
  await give(network, 0, shown);
  await act(async () => result.current.see(5));
  await unmount();
  expect(shown.destroyed).toBe(true);

  const coming = ad("B");
  await act(async () => {
    network.asked[1](coming as unknown as NativeAd);
  });
  expect(coming.destroyed).toBe(true);
});
