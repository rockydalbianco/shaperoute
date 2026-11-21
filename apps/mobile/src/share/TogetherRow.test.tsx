/**
 * «Together» in «Edit video» (TASK-417 part D2b): a switch when somebody
 * tagged ran with the author; off, with why, when nobody did; nothing when
 * the API has nothing to say.
 */
import { fireEvent, render, screen } from "@testing-library/react-native";

import { TogetherRow } from "./TogetherRow";

test("with runners, a switch that turns «Together» on", async () => {
  const onChange = jest.fn();
  await render(
    <TogetherRow state={{ kind: "ready", people: 3 }} on={false} onChange={onChange} />,
  );
  expect(screen.getByText("Together")).toBeOnTheScreen();
  expect(
    screen.getByText(
      "Your run and the runs of the people tagged here, on the same clock.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByText("Up to 4 people in one video.")).toBeOnTheScreen();
  await fireEvent(screen.getByTestId("together-switch"), "valueChange", true);
  expect(onChange).toHaveBeenCalledWith(true);
});

test("nobody ran with the author: off, and why", async () => {
  await render(<TogetherRow state={{ kind: "alone" }} on onChange={jest.fn()} />);
  expect(screen.getByText("No one tagged ran at the same time.")).toBeOnTheScreen();
  const control = screen.getByTestId("together-switch");
  expect(control.props.value).toBe(false);
  expect(control.props.disabled).toBe(true);
});

test("nothing from the API: no row", async () => {
  await render(
    <TogetherRow state={{ kind: "none" }} on={false} onChange={jest.fn()} />,
  );
  expect(screen.queryByTestId("together-row")).toBeNull();
});
