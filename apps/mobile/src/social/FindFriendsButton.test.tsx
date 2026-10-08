import { fireEvent, render, screen } from "@testing-library/react-native";

import { FindFriendsButton } from "./FindFriendsButton";
import { PeopleContext } from "./peopleDoor";

test("only a lens: «Find friends» is for VoiceOver, and opens the search", async () => {
  const open = jest.fn();
  await render(
    <PeopleContext.Provider value={{ open }}>
      <FindFriendsButton />
    </PeopleContext.Provider>,
  );
  // Nothing written on the screen (the user's choice): the name is the button's.
  expect(screen.queryByText("Find friends")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Find friends" }));
  expect(open).toHaveBeenCalledTimes(1);
});
