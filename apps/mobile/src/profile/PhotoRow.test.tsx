import { fireEvent, render, screen } from "@testing-library/react-native";

import { PhotoRow } from "./PhotoRow";
import { ProfilePhotoContext, type ProfilePhotoState } from "./useProfilePhoto";

const URI = "data:image/jpeg;base64,aGVsbG8=";

async function show(over: Partial<ProfilePhotoState> = {}) {
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
      <PhotoRow name="runner_42" />
    </ProfilePhotoContext.Provider>,
  );
  return photo;
}

test("without a picture the row shows the letter, and opens two ways to choose one", async () => {
  const photo = await show();
  expect(screen.getByText("R")).toBeOnTheScreen();
  expect(screen.queryByTestId("avatar-photo")).toBeNull();
  const row = screen.getByRole("button", { name: "Profile picture" });
  expect(screen.queryByRole("button", { name: "Choose a picture" })).toBeNull();

  await fireEvent.press(row);
  expect(photo.clearProblem).toHaveBeenCalledTimes(1);
  expect(row).toBeExpanded();
  expect(screen.getByRole("button", { name: "Take a photo" })).toBeOnTheScreen();
  // Nothing to remove.
  expect(screen.queryByRole("button", { name: "Remove picture" })).toBeNull();

  await fireEvent.press(screen.getByRole("button", { name: "Choose a picture" }));
  expect(photo.choose).toHaveBeenCalledWith("library");
  // Chosen: the ways close.
  expect(screen.queryByRole("button", { name: "Take a photo" })).toBeNull();

  await fireEvent.press(row);
  await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
  expect(photo.choose).toHaveBeenLastCalledWith("camera");
});

test("with a picture the row shows it, and it can be removed", async () => {
  const photo = await show({ uri: URI });
  expect(screen.getByTestId("avatar-photo")).toHaveProp("source", { uri: URI });
  expect(screen.queryByText("R")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Profile picture" }));
  await fireEvent.press(screen.getByRole("button", { name: "Remove picture" }));
  expect(photo.remove).toHaveBeenCalledTimes(1);
  expect(photo.choose).not.toHaveBeenCalled();
});

test("tapped again, the ways close without choosing", async () => {
  const photo = await show();
  const row = screen.getByRole("button", { name: "Profile picture" });
  await fireEvent.press(row);
  await fireEvent.press(row);
  expect(screen.queryByRole("button", { name: "Choose a picture" })).toBeNull();
  expect(photo.choose).not.toHaveBeenCalled();
});

test("while it saves the row says so and takes no tap", async () => {
  await show({ busy: "saving" });
  const row = screen.getByRole("button", { name: "Profile picture, Saving…" });
  expect(screen.getByText("Saving…")).toBeOnTheScreen();
  expect(row).toBeDisabled();
  await fireEvent.press(row);
  expect(screen.queryByRole("button", { name: "Choose a picture" })).toBeNull();
});

test("while the phone's picker is open nothing is written on the row", async () => {
  await show({ busy: "picking" });
  expect(screen.getByRole("button", { name: "Profile picture" })).toBeDisabled();
  expect(screen.queryByText("Saving…")).toBeNull();
});

test("a failure is said under the row", async () => {
  await show({ problem: "This picture cannot be used. Choose another one." });
  expect(
    screen.getByText("This picture cannot be used. Choose another one."),
  ).toBeOnTheScreen();
});
