import comments from "@shaperoute/shared-types/fixtures/comments.json";
import type { Comment, CommentsPage } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { AccountOutcome } from "../api/accounts";
import { CommentsContext, type CommentsDoor } from "./commentsDoor";
import { DrawingComments } from "./DrawingComments";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const DRAWING = "3f9d2c71-8a4b-4e06-b5d1-c27e9a40f815";
const [FROM_OTHER, FROM_OWNER] = comments.comments as Comment[];
const OLDER: Comment = {
  ...FROM_OTHER,
  id: "older",
  text: "The third one, on the next page",
};

function page(
  list: Comment[],
  next: string | null = null,
): AccountOutcome<CommentsPage> {
  return { kind: "ok", value: { comments: list, next, total: list.length } };
}

/** A door whose pages are `pages`, in order, and whose writes answer `written`. */
function door(
  pages: AccountOutcome<CommentsPage>[],
  written: AccountOutcome<Comment>[] = [],
) {
  const value: CommentsDoor = {
    pageOf: jest.fn(async () => pages.shift() ?? null),
    write: jest.fn(async () => written.shift() ?? null),
    remove: jest.fn(async () => ({ kind: "ok", value: null }) as const),
    photoOf: jest.fn(async () => null),
  };
  return value;
}

async function show(value: CommentsDoor) {
  await render(
    <CommentsContext.Provider value={value}>
      <DrawingComments drawingId={DRAWING} />
    </CommentsContext.Provider>,
  );
}

async function opened(value: CommentsDoor, label: string) {
  await show(value);
  await fireEvent.press(await screen.findByRole("button", { name: label }));
}

test("nobody signed in, or an API without comments: no button", async () => {
  await show(door([]));
  await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
  await show(
    door([
      {
        kind: "api_error",
        code: "http_error",
        message: "Not Found",
        suggested_distance_m: null,
        retryAfterS: null,
      },
    ]),
  );
  await waitFor(() => expect(screen.queryByText("Comments")).toBeNull());
});

test("the button says how many; the sheet shows them, the oldest first", async () => {
  const value = door([
    { kind: "ok", value: { comments: [FROM_OTHER, FROM_OWNER], next: "c", total: 3 } },
    page([OLDER]),
  ]);
  await opened(value, "3 comments");
  expect(value.pageOf).toHaveBeenCalledWith(DRAWING, null);
  expect(screen.getByText(FROM_OTHER.text)).toBeOnTheScreen();
  expect(screen.getByText(FROM_OWNER.text)).toBeOnTheScreen();
  expect(screen.getAllByText(/other_runner/).length).toBeGreaterThan(0);
  expect(value.photoOf).toHaveBeenCalledWith(FROM_OTHER.author.public_id);
  await fireEvent.press(screen.getByRole("button", { name: "Show more comments" }));
  expect(await screen.findByText(OLDER.text)).toBeOnTheScreen();
  expect(value.pageOf).toHaveBeenLastCalledWith(DRAWING, "c");
  expect(screen.queryByRole("button", { name: "Show more comments" })).toBeNull();
});

test("no comments yet: an invitation to write the first", async () => {
  await opened(door([page([])]), "Write a comment");
  expect(screen.getByText("No comments yet. Be the first.")).toBeOnTheScreen();
});

test("a comment written goes at the end, and the field empties", async () => {
  const mine: Comment = { ...FROM_OTHER, id: "mine", text: "Great score!" };
  const value = door([page([FROM_OTHER])], [{ kind: "ok", value: mine }]);
  await opened(value, "1 comment");
  const post = screen.getByRole("button", { name: "Post" });
  // Nothing written, nothing to post.
  expect(post).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText("Comment"), "  Great score!  ");
  await fireEvent.press(screen.getByRole("button", { name: "Post" }));
  expect(value.write).toHaveBeenCalledWith(DRAWING, "  Great score!  ");
  expect(await screen.findByText("Great score!")).toBeOnTheScreen();
  expect(screen.getByLabelText("Comment").props.value).toBe("");
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(screen.getByRole("button", { name: "2 comments" })).toBeOnTheScreen();
});

test("too long: the count turns, and «Post» waits", async () => {
  await opened(door([page([])]), "Write a comment");
  await fireEvent.changeText(screen.getByLabelText("Comment"), "x".repeat(460));
  expect(screen.getByText("460/500")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText("Comment"), "x".repeat(501));
  expect(screen.getByText("501/500")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
});

test("a comment the API refuses says why, and the words stay", async () => {
  const value = door(
    [page([])],
    [
      {
        kind: "api_error",
        code: "too_many_requests",
        message: "Too many comments in a minute: wait a moment and try again.",
        suggested_distance_m: null,
        retryAfterS: 40,
      },
    ],
  );
  await opened(value, "Write a comment");
  await fireEvent.changeText(screen.getByLabelText("Comment"), "One more");
  await fireEvent.press(screen.getByRole("button", { name: "Post" }));
  expect(
    await screen.findByText(
      "Too many comments in a minute: wait a moment and try again.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Comment").props.value).toBe("One more");
});

test("a negative comment is refused with an alert, and the words stay", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const value = door(
    [page([])],
    [
      {
        kind: "api_error",
        code: "comment_rejected",
        message: "You can't write negative comments in this app. Try another app.",
        suggested_distance_m: null,
        reason: "negative",
        retryAfterS: null,
      },
    ],
  );
  await opened(value, "Write a comment");
  await fireEvent.changeText(screen.getByLabelText("Comment"), "What an ugly route");
  await fireEvent.press(screen.getByRole("button", { name: "Post" }));
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      "You can't write negative comments in this app. Try another app.",
    ),
  );
  expect(screen.getByLabelText("Comment").props.value).toBe("What an ugly route");
  expect(screen.getByText("No comments yet. Be the first.")).toBeOnTheScreen();
  alert.mockRestore();
});

test("a comment of one's own is held to delete it; another's is not", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const value = door([page([FROM_OTHER, FROM_OWNER])]);
  await opened(value, "2 comments");
  // FROM_OWNER is not deletable for who asks.
  await fireEvent(screen.getByText(FROM_OWNER.text), "longPress");
  expect(alert).not.toHaveBeenCalled();
  await fireEvent(screen.getByText(FROM_OTHER.text), "longPress");
  expect(alert).toHaveBeenCalledWith(
    "Delete this comment?",
    undefined,
    expect.any(Array),
  );
  const buttons = alert.mock.calls[0][2] ?? [];
  buttons.find((b) => b.text === "Delete")?.onPress?.();
  expect(value.remove).toHaveBeenCalledWith(FROM_OTHER.id);
  await waitFor(() => expect(screen.queryByText(FROM_OTHER.text)).toBeNull());
  alert.mockRestore();
});

test("a comment is plain text: a link or a tag is shown as written", async () => {
  const html: Comment = {
    ...FROM_OTHER,
    text: '<a href="https://example.com">look</a> & <b>bold</b>',
  };
  await opened(door([page([html])]), "1 comment");
  expect(screen.getByText(html.text)).toBeOnTheScreen();
});

test("comments that did not come can be asked again", async () => {
  const value = door([{ kind: "unreachable", url: "http://api" }, page([FROM_OTHER])]);
  await opened(value, "Comments");
  expect(
    screen.getByText("No connection. Try again when you are online."),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText(FROM_OTHER.text)).toBeOnTheScreen();
});
