import threads from "@shaperoute/shared-types/fixtures/comment-threads.json";
import comments from "@shaperoute/shared-types/fixtures/comments.json";
import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { CommentsPage, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { Account } from "../account/useAccount";
import { keyHeaders } from "../api/apiUrl";
import { CommentAvatar } from "./CommentAvatar";
import { CommentsContext, useCommentsOf } from "./commentsDoor";
import { DrawingComments } from "./DrawingComments";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const URL = "http://api";
const KEY = "k1";
const DRAWING = "3f9d2c71-8a4b-4e06-b5d1-c27e9a40f815";
const signedIn = session as Session;
const SOURCE = {
  uri: `${URL}/users/p/photo?v=1`,
  headers: { Authorization: "Bearer t" },
};

describe("the circle of who wrote a comment", () => {
  test("no picture: the letter", async () => {
    await render(<CommentAvatar name="ada" size={32} source={null} />);
    expect(screen.getByText("A")).toBeOnTheScreen();
    expect(screen.queryByTestId("comment-author-photo")).toBeNull();
    expect(screen.queryByTestId("avatar-photo")).toBeNull();
  });

  test("a picture at its address: over the letter, which shows meanwhile", async () => {
    await render(<CommentAvatar name="ada" size={32} source={SOURCE} />);
    expect(screen.getByTestId("comment-author-photo").props.source).toEqual(SOURCE);
    // Nothing of its own behind the picture: the letter until it is read.
    expect(screen.getByText("A")).toBeOnTheScreen();
  });

  test("a picture that does not come leaves the letter", async () => {
    const { rerender } = await render(
      <CommentAvatar name="ada" size={32} source={SOURCE} />,
    );
    await fireEvent(screen.getByTestId("comment-author-photo"), "error");
    expect(screen.queryByTestId("comment-author-photo")).toBeNull();
    expect(screen.getByText("A")).toBeOnTheScreen();
    // A new picture has a new address, and is tried.
    const newer = { ...SOURCE, uri: `${URL}/users/p/photo?v=2` };
    await rerender(<CommentAvatar name="ada" size={32} source={newer} />);
    expect(screen.getByTestId("comment-author-photo").props.source).toEqual(newer);
  });

  test("the profile's picture, the way of an API from before", async () => {
    const photo = "data:image/jpeg;base64,AAAA";
    await render(<CommentAvatar name="ada" size={32} source={null} photo={photo} />);
    expect(screen.getByTestId("avatar-photo").props.source).toEqual({ uri: photo });
    expect(screen.queryByTestId("comment-author-photo")).toBeNull();
  });
});

// The whole way, from the API's answer to the picture (TASK-497): the real
// door of the comments over a fetch that says what was asked.
describe("the comments of a drawing and their pictures", () => {
  const ACCOUNT: Account = {
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

  /** A fetch that answers the comments with `page`, and a profile with the example's. */
  function api(page: unknown) {
    return jest.fn(async (url: string, _init?: RequestInit) =>
      Response.json(url.includes("/users/") ? publicProfile : page),
    );
  }

  function Sheet({ fetchFn }: { fetchFn: jest.Mock }) {
    const door = useCommentsOf(URL, ACCOUNT, { fetchFn, key: KEY });
    return (
      <CommentsContext.Provider value={door}>
        <DrawingComments drawingId={DRAWING} />
      </CommentsContext.Provider>
    );
  }

  async function opened(fetchFn: jest.Mock, total: number) {
    await render(<Sheet fetchFn={fetchFn} />);
    const label = `${total} comments`;
    await fireEvent.press(await screen.findByRole("button", { name: label }));
  }

  const asked = (fetchFn: jest.Mock) => fetchFn.mock.calls.map(([url]) => String(url));

  test("with the address in the comment no profile is asked for", async () => {
    const page = threads as CommentsPage;
    const [top] = page.comments;
    const [first, second] = top.replies ?? [];
    const fetchFn = api(page);
    await opened(fetchFn, page.total);
    expect(await screen.findByText(first.text)).toBeOnTheScreen();
    // Two of the three have a picture: each at its address, with the token
    // and the key; the third is its letter, with nothing asked.
    expect(top.author.photo).toBeNull();
    const pictures = screen.getAllByTestId("comment-author-photo");
    expect(pictures.map((picture) => picture.props.source)).toEqual(
      [first, second].map((reply) => ({
        uri: `${URL}${reply.author.photo}`,
        headers: {
          ...keyHeaders(KEY),
          Authorization: `Bearer ${signedIn.token}`,
        },
      })),
    );
    expect(screen.queryByTestId("avatar-photo")).toBeNull();
    // The page of the comments, and nothing else: no GET /users/{id}.
    expect(asked(fetchFn)).toEqual([
      `${URL}/drawings/${DRAWING}/comments?threads=true`,
    ]);
  });

  test("an API from before says no address: the profile, as it was", async () => {
    const page = comments as CommentsPage;
    const [fromOther, fromOwner] = page.comments;
    expect(fromOther.author.photo).toBeUndefined();
    const fetchFn = api({ ...page, next: null });
    await opened(fetchFn, page.total);
    expect(await screen.findByText(fromOther.text)).toBeOnTheScreen();
    // One profile per author, and its picture in the circle.
    await waitFor(() =>
      expect(
        asked(fetchFn)
          .filter((url) => url.includes("/users/"))
          .sort(),
      ).toEqual(
        [fromOther, fromOwner]
          .map((comment) => `${URL}/users/${comment.author.public_id}`)
          .sort(),
      ),
    );
    expect(await screen.findAllByTestId("avatar-photo")).toHaveLength(2);
    expect(screen.queryByTestId("comment-author-photo")).toBeNull();
  });
});
