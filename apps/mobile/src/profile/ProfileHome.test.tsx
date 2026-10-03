import session from "@shaperoute/shared-types/fixtures/session.json";
import type { User } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { ProfileHome } from "./ProfileHome";
import { ProfilePhotoContext, type ProfilePhotoState } from "./useProfilePhoto";

const user = session.user as User;

async function show({
  favorites = 2,
  activities = 5,
  shown = user,
}: { favorites?: number | null; activities?: number | null; shown?: User } = {}) {
  const onOpen = jest.fn();
  const onEdit = jest.fn();
  await render(
    <ProfileHome
      user={shown}
      favorites={favorites}
      activities={activities}
      onOpen={onOpen}
      onEdit={onEdit}
    />,
  );
  return Object.assign(onOpen, { onEdit });
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
      <ProfileHome
        user={user}
        favorites={2}
        activities={5}
        onOpen={jest.fn()}
        onEdit={jest.fn()}
      />
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

test("the bio shows under who it is, and an empty one or none shows nothing", async () => {
  await show({ shown: { ...user, bio: "Hearts on Sundays.\nTrento." } });
  expect(screen.getByText("Hearts on Sundays.\nTrento.")).toBeOnTheScreen();
  await show({ shown: { ...user, bio: "" } });
  expect(screen.queryByText(/Hearts/)).toBeNull();
  // An API older than TASK-116 sends no bio at all.
  const { bio: _bio, ...before } = user;
  await show({ shown: before });
  expect(screen.getByText("Runner_42")).toBeOnTheScreen();
  expect(screen.queryByText(/Hearts/)).toBeNull();
});

test("«Edit profile» opens its page (TASK-116)", async () => {
  const opened = await show();
  await fireEvent.press(screen.getByRole("button", { name: "Edit profile" }));
  expect(opened.onEdit).toHaveBeenCalledTimes(1);
  expect(opened).not.toHaveBeenCalled();
});

async function showWithPhoto(over: Partial<ProfilePhotoState> = {}) {
  const photo: ProfilePhotoState = {
    uri: null,
    busy: null,
    problem: null,
    choose: jest.fn(),
    remove: jest.fn(),
    clearProblem: jest.fn(),
    ...over,
  };
  await render(
    <ProfilePhotoContext.Provider value={photo}>
      <ProfileHome
        user={user}
        favorites={2}
        activities={5}
        onOpen={jest.fn()}
        onEdit={jest.fn()}
      />
    </ProfilePhotoContext.Provider>,
  );
  return photo;
}

test("the circle has a «+» and opens the ways to add a picture (TASK-207)", async () => {
  const photo = await showWithPhoto();
  expect(screen.getByTestId("photo-plus")).toBeOnTheScreen();
  const circle = screen.getByRole("button", { name: "Profile picture" });
  expect(screen.queryByRole("button", { name: "Choose a picture" })).toBeNull();

  await fireEvent.press(circle);
  expect(photo.clearProblem).toHaveBeenCalledTimes(1);
  expect(circle).toBeExpanded();
  expect(screen.getByRole("button", { name: "Take a photo" })).toBeOnTheScreen();
  // Nothing to remove.
  expect(screen.queryByRole("button", { name: "Remove picture" })).toBeNull();

  await fireEvent.press(screen.getByRole("button", { name: "Choose a picture" }));
  expect(photo.choose).toHaveBeenCalledWith("library");
  // Chosen: the ways close.
  expect(screen.queryByRole("button", { name: "Take a photo" })).toBeNull();

  await fireEvent.press(circle);
  await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
  expect(photo.choose).toHaveBeenLastCalledWith("camera");
});

test("with a picture the circle keeps its «+», and the picture can be removed", async () => {
  const photo = await showWithPhoto({ uri: "data:image/jpeg;base64,aGVsbG8=" });
  expect(screen.getByTestId("photo-plus")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Profile picture" }));
  await fireEvent.press(screen.getByRole("button", { name: "Remove picture" }));
  expect(photo.remove).toHaveBeenCalledTimes(1);
  expect(photo.choose).not.toHaveBeenCalled();
});

test("tapped again, the circle closes the ways without choosing", async () => {
  const photo = await showWithPhoto();
  const circle = screen.getByRole("button", { name: "Profile picture" });
  await fireEvent.press(circle);
  await fireEvent.press(circle);
  expect(screen.queryByRole("button", { name: "Choose a picture" })).toBeNull();
  expect(photo.choose).not.toHaveBeenCalled();
});

test("while the picture is saved «Profile» says so and the circle takes no tap", async () => {
  await showWithPhoto({ busy: "saving" });
  expect(screen.getByText("Saving…")).toBeOnTheScreen();
  const circle = screen.getByRole("button", { name: "Profile picture" });
  expect(circle).toBeDisabled();
  await fireEvent.press(circle);
  expect(screen.queryByRole("button", { name: "Choose a picture" })).toBeNull();
});

test("a change that failed is said in «Profile»", async () => {
  await showWithPhoto({
    problem: "Profile pictures are not available on this API yet.",
  });
  expect(
    screen.getByText("Profile pictures are not available on this API yet."),
  ).toBeOnTheScreen();
});
