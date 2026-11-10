import feed from "@shaperoute/shared-types/fixtures/feed.json";
import type { FeedPost } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { DrawingsContext, useDrawingsDoor } from "../social/drawingsDoor";
import { ResortPosts } from "./ResortPosts";

// «Members' days here» on a resort's page (TASK-406 part D3).

const FIRST = { ...feed.posts[0], activity: "skiing" } as FeedPost;
const SECOND = { ...FIRST, id: "00000000-0000-4000-8000-000000000002" } as FeedPost;

function Page({
  posts,
  open = jest.fn(),
  onLeave = jest.fn(),
}: {
  posts: jest.Mock;
  open?: jest.Mock;
  onLeave?: jest.Mock;
}) {
  const nothing = useDrawingsDoor();
  return (
    <DrawingsContext.Provider value={{ ...nothing, resortPostsOf: posts, open }}>
      <ResortPosts resortId="aaa1" onLeave={onLeave} />
    </DrawingsContext.Provider>
  );
}

async function laidOut() {
  await act(async () => {
    fireEvent(screen.getByTestId("resort-posts"), "layout", {
      nativeEvent: { layout: { width: 358, height: 400 } },
    });
  });
}

test("the members' days, with who skied them; a tap opens one on the map", async () => {
  const posts = jest.fn(async () => ({ posts: [FIRST], next: null, total: 1 }));
  const open = jest.fn();
  const onLeave = jest.fn();
  await render(<Page posts={posts} open={open} onLeave={onLeave} />);
  expect(posts).toHaveBeenCalledWith("aaa1", null);
  expect(await screen.findByText("Members' days here")).toBeOnTheScreen();
  await laidOut();
  await fireEvent.press(screen.getByTestId(`resort-post-${FIRST.id}`));
  expect(open).toHaveBeenCalledWith(FIRST);
  expect(onLeave).toHaveBeenCalled();
  expect(screen.queryByText("Show more")).toBeNull();
});

test("«Show more» brings the next page, without a post twice", async () => {
  const posts = jest
    .fn()
    .mockResolvedValueOnce({ posts: [FIRST], next: "17-ab", total: 2 })
    .mockResolvedValueOnce({ posts: [FIRST, SECOND], next: null, total: 2 });
  await render(<Page posts={posts} />);
  await screen.findByText("Members' days here");
  await laidOut();
  await fireEvent.press(screen.getByText("Show more"));
  expect(posts).toHaveBeenLastCalledWith("aaa1", "17-ab");
  expect(await screen.findByTestId(`resort-post-${SECOND.id}`)).toBeOnTheScreen();
  expect(screen.getAllByTestId(`resort-post-${FIRST.id}`)).toHaveLength(1);
});

test("no days there, or no answer: nothing", async () => {
  const none = jest.fn(async () => ({ posts: [], next: null, total: 0 }));
  await render(<Page posts={none} />);
  expect(none).toHaveBeenCalled();
  expect(screen.queryByTestId("resort-posts")).toBeNull();
});
