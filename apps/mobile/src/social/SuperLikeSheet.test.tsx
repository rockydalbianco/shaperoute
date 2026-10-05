import { COMMENT_MAX_LENGTH } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { HEART_ALONE_MS, SuperLikeHeart, SuperLikeSheet } from "./SuperLikeSheet";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

type Over = Partial<Parameters<typeof SuperLikeSheet>[0]>;

function sheet(over: Over = {}) {
  const props = {
    visible: true,
    sending: false,
    problem: null,
    onSend: jest.fn(),
    onCancel: jest.fn(),
    ...over,
  };
  return { props, node: <SuperLikeSheet {...props} /> };
}

const field = () => screen.getByLabelText("Comment");
const send = () => screen.getByRole("button", { name: "Send" });

test("closed, nothing of it is on screen", async () => {
  await render(sheet({ visible: false }).node);
  expect(screen.queryByText("Super like")).toBeNull();
  expect(screen.queryByTestId("super-like-heart")).toBeNull();
});

test("open: the Sgrava heart over the drawing, and the field for its comment", async () => {
  await render(sheet().node);
  expect(screen.getByRole("header", { name: "Super like" })).toBeTruthy();
  expect(screen.getByTestId("super-like-heart")).toBeTruthy();
  expect(
    screen.getByPlaceholderText("Write a comment to send your super like"),
  ).toBeTruthy();
});

test("«Send» is off under two characters, spaces around not counted", async () => {
  const { props, node } = sheet();
  await render(node);
  expect(send()).toBeDisabled();
  expect(screen.getByText("At least 2 characters")).toBeTruthy();

  await fireEvent.changeText(field(), " a  ");
  expect(send()).toBeDisabled();
  await fireEvent.press(send());
  expect(props.onSend).not.toHaveBeenCalled();

  await fireEvent.changeText(field(), "ok");
  expect(send()).toBeEnabled();
  expect(screen.queryByText("At least 2 characters")).toBeNull();
  await fireEvent.press(send());
  expect(props.onSend).toHaveBeenCalledWith("ok");
});

test("«Cancel», or a tap over the sheet, sends nothing", async () => {
  const { props, node } = sheet();
  await render(node);
  await fireEvent.changeText(field(), "What a heart");
  await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  await fireEvent.press(screen.getByTestId("super-like-backdrop"));
  expect(props.onCancel).toHaveBeenCalledTimes(2);
  expect(props.onSend).not.toHaveBeenCalled();
});

test("on its way, the words wait and «Send» is off", async () => {
  await render(sheet({ sending: true }).node);
  expect(field()).toHaveProp("editable", false);
  expect(send()).toBeDisabled();
});

test("why it did not go is said in place of the hint", async () => {
  await render(
    sheet({ problem: "No connection. Try again when you are online." }).node,
  );
  expect(
    screen.getByText("No connection. Try again when you are online."),
  ).toBeTruthy();
  expect(screen.queryByText("At least 2 characters")).toBeNull();
});

test("near the limit the count shows, and over it «Send» is off", async () => {
  await render(sheet().node);
  await fireEvent.changeText(field(), "x".repeat(COMMENT_MAX_LENGTH));
  expect(screen.getByText(`${COMMENT_MAX_LENGTH}/${COMMENT_MAX_LENGTH}`)).toBeTruthy();
  expect(send()).toBeEnabled();
  await fireEvent.changeText(field(), "x".repeat(COMMENT_MAX_LENGTH + 1));
  expect(send()).toBeDisabled();
});

test("each opening starts from an empty field", async () => {
  const { rerender } = await render(sheet().node);
  await fireEvent.changeText(field(), "Left unsent");
  await rerender(sheet({ visible: false }).node);
  await rerender(sheet().node);
  expect(field()).toHaveProp("value", "");
});

describe("the heart alone", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("comes up for a moment, then says it is gone, once", async () => {
    const onDone = jest.fn();
    await render(<SuperLikeHeart onDone={onDone} />);
    expect(screen.getByTestId("super-like-heart")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(HEART_ALONE_MS - 1);
    });
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
