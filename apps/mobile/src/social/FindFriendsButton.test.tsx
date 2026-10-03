import { fireEvent, render, screen } from "@testing-library/react-native";

import { FindFriendsButton } from "./FindFriendsButton";
import { PeopleContext } from "./peopleDoor";

test("«Find friends» opens the search", async () => {
  const open = jest.fn();
  await render(
    <PeopleContext.Provider value={{ open }}>
      <FindFriendsButton />
    </PeopleContext.Provider>,
  );
  expect(screen.getByText("Find friends")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Find friends" }));
  expect(open).toHaveBeenCalledTimes(1);
});
