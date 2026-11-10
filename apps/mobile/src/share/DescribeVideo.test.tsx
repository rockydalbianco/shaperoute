import { fireEvent, render, screen } from "@testing-library/react-native";

import { DescribeVideo } from "./DescribeVideo";
import { FIRST_EDIT } from "./videoEdit";

describe("DescribeVideo (TASK-408 D)", () => {
  it("shows the field with its example and the line under it", async () => {
    await render(<DescribeVideo edit={FIRST_EDIT} onChange={jest.fn()} />);
    expect(screen.getByText("Describe your video")).toBeOnTheScreen();
    expect(
      screen.getByPlaceholderText("a horse at night, fireworks at the end"),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("An animal, colours, emoji, the ending. Read on your phone."),
    ).toBeOnTheScreen();
  });

  it("fills the sheet's choices once the field is done, the rest as it was", async () => {
    const onChange = jest.fn();
    const edit = { ...FIRST_EDIT, line: "pink" as const };
    await render(<DescribeVideo edit={edit} onChange={onChange} />);
    const field = screen.getByTestId("describe-video");
    await fireEvent.changeText(field, "a fox from behind, fireworks at the end");
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent(field, "endEditing");
    expect(onChange).toHaveBeenCalledWith({
      ...edit,
      character: "fox",
      camera: "behind",
      style: "3d",
      end: "🎆",
    });
  });

  it("changes nothing for an empty field", async () => {
    const onChange = jest.fn();
    await render(<DescribeVideo edit={FIRST_EDIT} onChange={onChange} />);
    await fireEvent.changeText(screen.getByTestId("describe-video"), "   ");
    await fireEvent(screen.getByTestId("describe-video"), "endEditing");
    expect(onChange).not.toHaveBeenCalled();
  });
});
