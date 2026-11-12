import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createContext, type ReactNode, useContext, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { androidBack } from "../ui/androidBack.testing";
import { useBackCloses } from "../ui/backLayers";
import {
  OverAppPages,
  OverAppProvider,
  OverAppSlot,
  useCoverOverApp,
  useModalPage,
  useOverAppState,
} from "./overAppContext";

// The pages over the app and what the app shows of its own (TASK-470 D):
// a profile opened from a post comes over the post's own Modal (defect 7),
// and «Play» opened by a notification over a page keeps that page, out of
// sight, instead of going under it (defect 8). The layer here is built of
// the same parts as `ProfileLayer`.

type Layer = { openProfile: () => void };
const LayerContext = createContext<Layer>({ openProfile: () => {} });

/** A member's profile over the app, with a field, as a conversation has. */
function Profile({ onBack }: { onBack: () => void }) {
  useBackCloses(true, onBack);
  const [text, setText] = useState("");
  return (
    <View testID="profile">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
      />
      <TextInput testID="profile-field" value={text} onChangeText={setText} />
    </View>
  );
}

/** As `ProfileLayer`: the app, and the pages over it in place or in the
 * slot of a page in a Modal. */
function TestLayer({ children }: { children: ReactNode }) {
  const [door, state] = useOverAppState();
  const [profile, setProfile] = useState(false);
  const pages = (
    <OverAppPages covered={state.covered}>
      {profile && <Profile onBack={() => setProfile(false)} />}
    </OverAppPages>
  );
  const inModal = state.modalPages > 0;
  return (
    <LayerContext.Provider value={{ openProfile: () => setProfile(true) }}>
      <OverAppProvider
        door={door}
        slot={{ pages: inModal ? pages : null, shown: profile }}
      >
        {children}
      </OverAppProvider>
      {!inModal && pages}
    </LayerContext.Provider>
  );
}

let postMounts = 0;

/** As `PostPage`: a Modal of its own, a scroll and an unsent comment. */
function Post() {
  useModalPage();
  return (
    <Modal visible testID="post">
      <PostBody />
      <OverAppSlot />
    </Modal>
  );
}

function PostBody() {
  const [mounted] = useState(() => {
    postMounts += 1;
    return postMounts;
  });
  const [y, setY] = useState(0);
  const [comment, setComment] = useState("");
  const { openProfile } = useContext(LayerContext);
  return (
    <ScrollView
      testID="post-scroll"
      onScroll={(event) => setY(event.nativeEvent.contentOffset.y)}
    >
      <Text>{`mount ${mounted} at ${y}`}</Text>
      <TextInput testID="comment" value={comment} onChangeText={setComment} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Author"
        onPress={openProfile}
      />
    </ScrollView>
  );
}

function App({ post = false, play = false }: { post?: boolean; play?: boolean }) {
  useCoverOverApp(play);
  return (
    <View>
      {post && <Post />}
      {play && <Text>Play</Text>}
    </View>
  );
}

let back: ReturnType<typeof androidBack>;
beforeEach(() => {
  postMounts = 0;
  back = androidBack();
});
afterEach(() => {
  back.restore();
});

test("a profile opened from a post comes inside the post's Modal, over it", async () => {
  await render(
    <TestLayer>
      <App post />
    </TestLayer>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Author" }));
  // Inside the post's Modal, after its content: on the phone, over it.
  const post = screen.getByTestId("post");
  expect(post).toContainElement(screen.getByTestId("profile"));
});

test("closing the profile finds the post as it was: its scroll and the comment being written", async () => {
  await render(
    <TestLayer>
      <App post />
    </TestLayer>,
  );
  await fireEvent.scroll(screen.getByTestId("post-scroll"), {
    nativeEvent: { contentOffset: { x: 0, y: 640 } },
  });
  await fireEvent.changeText(screen.getByTestId("comment"), "Great line through");
  // The author's profile, or a notification touched while writing.
  await fireEvent.press(screen.getByRole("button", { name: "Author" }));
  expect(screen.getByTestId("profile")).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.queryByTestId("profile")).toBeNull();
  // The same post, never built again: at 640, the comment still there.
  expect(screen.getByText("mount 1 at 640")).toBeOnTheScreen();
  expect(screen.getByTestId("comment")).toHaveProp("value", "Great line through");
});

test("Android's «back» over the post closes the profile first", async () => {
  await render(
    <TestLayer>
      <App post />
    </TestLayer>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Author" }));
  let handled = false;
  await act(() => {
    handled = back.press();
  });
  expect(handled).toBe(true);
  expect(screen.queryByTestId("profile")).toBeNull();
  expect(screen.getByTestId("post")).toBeOnTheScreen();
});

test("without a post the pages over the app are views over it, as before", async () => {
  await render(
    <TestLayer>
      <App />
    </TestLayer>,
  );
  expect(screen.getByTestId("over-app-pages")).toBeOnTheScreen();
});

test("«Play» from a notification over a page keeps the page, out of sight and of «back», and finds it again", async () => {
  function Both({ play }: { play: boolean }) {
    return (
      <TestLayer>
        <App play={play} />
        <Opener />
      </TestLayer>
    );
  }
  function Opener() {
    const { openProfile } = useContext(LayerContext);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open"
        onPress={openProfile}
      />
    );
  }
  const view = await render(<Both play={false} />);
  await fireEvent.press(screen.getByRole("button", { name: "Open" }));
  await fireEvent.changeText(screen.getByTestId("profile-field"), "Half a message");

  // The notification of a shape unlocked: «Play» over the app.
  await view.rerender(<Both play />);
  expect(screen.getByText("Play")).toBeOnTheScreen();
  expect(
    screen.getByTestId("over-app-pages", { includeHiddenElements: true }),
  ).toHaveStyle({ display: "none" });
  // «back» is not the hidden page's.
  expect(back.press()).toBe(false);

  // «←» of «Play»: the page is there again, as it was left.
  await view.rerender(<Both play={false} />);
  expect(screen.getByTestId("over-app-pages")).not.toHaveStyle({ display: "none" });
  expect(screen.getByTestId("profile-field")).toHaveProp("value", "Half a message");
  expect(back.press()).toBe(true);
});

test("the app's post and «Play» use it: `PostPage` holds its slot, the app covers with «Play»", () => {
  const src = join(__dirname, "..", "..");
  const postPage = readFileSync(join(src, "src/feed/PostPage.tsx"), "utf8");
  expect(postPage).toMatch(/useModalPage\(\);/);
  expect(postPage).toMatch(/<OverAppSlot \/>/);
  expect(postPage).toMatch(/overShown \? closeTopLayer\(\) : onClose\(\)/);
  const app = readFileSync(join(src, "App.tsx"), "utf8");
  expect(app).toMatch(/useCoverOverApp\(screen === "play"\)/);
  const layer = readFileSync(join(src, "src/screens/ProfileLayer.tsx"), "utf8");
  expect(layer).toMatch(/pages: overInModal \? overPages : null/);
  expect(layer).toMatch(/\{!overInModal && overPages\}/);
});
