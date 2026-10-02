import session from "@shaperoute/shared-types/fixtures/session.json";
import type { User } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { ProfileHome } from "./ProfileHome";
import { ProfilePhotoContext, type ProfilePhotoState } from "./useProfilePhoto";

const user = session.user as User;

async function show({
  favorites = 2,
  activities = 5,
}: { favorites?: number | null; activities?: number | null } = {}) {
  const onOpen = jest.fn();
  await render(
    <ProfileHome
      user={user}
      favorites={favorites}
      activities={activities}
      onOpen={onOpen}
    />,
  );
  return onOpen;
}

test("who is signed in: the letter, the name and the email", async () => {
  await show();
  expect(screen.getByText("R")).toBeOnTheScreen();
  expect(screen.getByText("Runner_42")).toBeOnTheScreen();
  expect(screen.getByText("runner@example.com")).toBeOnTheScreen();
});

test("with a picture (TASK-178) the circle shows it instead of the letter", async () => {
  const uri = "data:image/jpeg;base64,aGVsbG8=";
  const photo = { uri, busy: null, problem: null } as ProfilePhotoState;
  await render(
    <ProfilePhotoContext.Provider value={photo}>
      <ProfileHome user={user} favorites={2} activities={5} onOpen={jest.fn()} />
    </ProfilePhotoContext.Provider>,
  );
  expect(screen.getByTestId("avatar-photo")).toHaveProp("source", { uri });
  expect(screen.queryByText("R")).toBeNull();
  expect(screen.getByText("Runner_42")).toBeOnTheScreen();
});

test("a heart by «Favorites», a running man by «My activities», each with its number", async () => {
  await show();
  const favorites = screen.getByRole("button", { name: "Favorites, 2" });
  expect(favorites).toHaveTextContent("❤️›2Favorites");
  const activities = screen.getByRole("button", { name: "My activities, 5" });
  expect(activities).toHaveTextContent("🏃‍♂️›5My activities");
});

test("each tile and «Settings» open their page", async () => {
  const onOpen = await show();
  await fireEvent.press(screen.getByRole("button", { name: /^Favorites/ }));
  await fireEvent.press(screen.getByRole("button", { name: /^My activities/ }));
  await fireEvent.press(screen.getByRole("button", { name: "Settings" }));
  expect(onOpen.mock.calls).toEqual([["favorites"], ["activities"], ["settings"]]);
});

test("until a list has come its tile says no number", async () => {
  await show({ favorites: null, activities: null });
  expect(screen.getByRole("button", { name: "Favorites" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "My activities" })).toBeOnTheScreen();
  expect(screen.queryByText("0")).toBeNull();
});
