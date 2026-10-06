import detail from "@shaperoute/shared-types/fixtures/drawing-details.json";
import type { DrawingDetail } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { DrawingCard } from "./DrawingCard";
import { DrawingsContext, useDrawingsDoor } from "./drawingsDoor";
import { FollowsContext } from "./followsDoor";

// A drawing opened from a profile, with what TASK-208 added: its photos,
// how it went, what it was, and the names tagged.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const DRAWING = detail as DrawingDetail;
const AUTH = { Authorization: "Bearer the-token" };

function Card({ openProfile }: { openProfile: jest.Mock }) {
  const nothing = useDrawingsDoor();
  return (
    <DrawingsContext.Provider
      value={{
        ...nothing,
        photoSource: (photo) => ({ uri: `http://api${photo.url}`, headers: AUTH }),
      }}
    >
      <FollowsContext.Provider
        value={{
          apiUrl: null,
          account: {
            state: { status: "signedOut", notice: null },
            sessionEnded: jest.fn(),
          },
          openProfile,
        }}
      >
        <DrawingCard drawing={DRAWING} onBack={jest.fn()} />
      </FollowsContext.Provider>
    </DrawingsContext.Provider>
  );
}

test("the card shows what it was, how it went, its photos with the token, and who is tagged", async () => {
  const openProfile = jest.fn();
  await render(<Card openProfile={openProfile} />);
  expect(screen.getByText("Sunday heart by the river")).toBeTruthy();
  expect(screen.getByText(/^Run · /)).toBeTruthy();
  expect(screen.getByText(DRAWING.description ?? "")).toBeTruthy();
  const photo = screen.getByLabelText("Photo 1");
  expect(photo.props.source).toEqual({
    uri: `http://api${DRAWING.photos?.[0].url}`,
    headers: AUTH,
  });
  await fireEvent.press(screen.getByRole("button", { name: "adam.trento's profile" }));
  expect(openProfile).toHaveBeenCalledWith({
    public_id: "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44",
    username: "adam.trento",
    photo: null,
  });
});

test("a drawing of an API before TASK-208 shows as before", async () => {
  const { photos: _p, tags: _t, description: _d, activity: _a, ...old } = DRAWING;
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: null,
        account: {
          state: { status: "signedOut", notice: null },
          sessionEnded: jest.fn(),
        },
        openProfile: jest.fn(),
      }}
    >
      <DrawingCard drawing={old as DrawingDetail} onBack={jest.fn()} />
    </FollowsContext.Provider>,
  );
  expect(screen.queryByText(/^Run · /)).toBeNull();
  expect(screen.queryByLabelText("Photo 1")).toBeNull();
  expect(screen.queryByText("adam.trento")).toBeNull();
});
