/**
 * A note under the route (TASK-444): a sign says whether to watch for it
 * or just to know it, by its shape and not by a colour, so that steps along
 * the way do not look like something gone wrong.
 */
import { render, screen } from "@testing-library/react-native";

import { color } from "../theme/tokens";
import { NOTE_ICON, NoteRow } from "./NoteRow";

const STEPS = "There are 120 m of steps along the way.";
const LONGER = "The route is 12% longer than asked.";

test("something to watch for has a triangle, in the colour of the words", async () => {
  await render(<NoteRow note={{ tone: "caution", text: STEPS }} />);
  expect(screen.getByText(STEPS)).toBeOnTheScreen();
  const icon = screen.getByTestId("note-icon-caution");
  expect(icon).toHaveStyle({
    width: NOTE_ICON,
    height: NOTE_ICON,
    tintColor: color.text,
  });
  expect(screen.queryByTestId("note-icon-info")).toBeNull();
});

test("something just to know has an «i», quieter", async () => {
  await render(<NoteRow note={{ tone: "info", text: LONGER }} />);
  const icon = screen.getByTestId("note-icon-info");
  expect(icon).toHaveStyle({ tintColor: color.textMuted });
  expect(icon.props.source).not.toEqual(
    require("../../assets/ui/icons/triangle-alert.png"),
  );
});

test("no colour of a warning nor of an error on a note, and no stripe", async () => {
  await render(<NoteRow note={{ tone: "caution", text: STEPS }} />);
  const row = screen.getByTestId("note-caution");
  expect(row).not.toHaveStyle({ borderLeftColor: color.warning });
  expect(row).not.toHaveStyle({ borderLeftWidth: 3 });
  const icon = screen.getByTestId("note-icon-caution");
  expect(icon).not.toHaveStyle({ tintColor: color.warning });
  expect(icon).not.toHaveStyle({ tintColor: color.error });
});

test("the sign is not read aloud: the sentence says it all", async () => {
  await render(<NoteRow note={{ tone: "caution", text: STEPS }} />);
  const icon = screen.getByTestId("note-icon-caution");
  expect(icon.props.accessible).toBe(false);
  expect(icon.props.importantForAccessibility).toBe("no");
  expect(screen.getByText(STEPS)).toBeOnTheScreen();
});
