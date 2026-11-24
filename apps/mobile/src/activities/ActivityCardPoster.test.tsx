/**
 * «Share» on a run of «My activities» (TASK-450): the poster has the title
 * of the run's post, the one the card shows, and the day of the run.
 */
import activity from "@shaperoute/shared-types/fixtures/activity.json";
import myDetails from "@shaperoute/shared-types/fixtures/my-drawing-details.json";
import type { MyDrawing } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { ActivityDetail } from "../api/activities";
import { choiceOf } from "../api/drawings";
import type { PostRun } from "../share/postRun";
import { DrawingsContext, useDrawingsDoor } from "../social/drawingsDoor";
import { ActivityCard } from "./ActivityCard";
import { whereAndWhat } from "./activityText";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");

// «Share» alone, handing over the run its post would open with.
const mockOpened = jest.fn<void, [PostRun]>();
jest.mock("../share/SharePost", () => {
  const { Pressable, Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    SharePostButton: ({ makeRun }: { makeRun: () => PostRun }) => (
      <Pressable accessibilityRole="button" onPress={() => mockOpened(makeRun())}>
        <Text>Share</Text>
      </Pressable>
    ),
  };
});

const MINE = myDetails as MyDrawing;
const RUN = { ...activity, id: MINE.key } as unknown as ActivityDetail;

/** The card with the post of its run as the API has it: titled `title`. */
function WithPost({ title, children }: { title: string | null; children: ReactNode }) {
  const nothing = useDrawingsDoor();
  return (
    <DrawingsContext.Provider
      value={{
        ...nothing,
        choiceOf: async () => ({
          kind: "known",
          choice: choiceOf({ ...MINE, title }),
          waiting: false,
          photos: [],
        }),
      }}
    >
      {children}
    </DrawingsContext.Provider>
  );
}

beforeEach(() => {
  mockOpened.mockClear();
});

test("the poster of a run with a titled post has the post's title and the run's day", async () => {
  await render(
    <WithPost title="Sunday heart by the river">
      <ActivityCard activity={RUN} onDelete={jest.fn()} />
    </WithPost>,
  );
  await waitFor(() =>
    expect(screen.getByTestId("activity-card-heading")).toHaveTextContent(
      "Sunday heart by the river",
    ),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Share" }));
  expect(mockOpened).toHaveBeenCalledTimes(1);
  expect(mockOpened.mock.calls[0][0]).toMatchObject({
    key: RUN.id,
    title: "Sunday heart by the river",
    startedAt: RUN.started_at,
  });
});

test("with no title on the post, the poster says what it always said", async () => {
  await render(
    <WithPost title={null}>
      <ActivityCard activity={RUN} onDelete={jest.fn()} />
    </WithPost>,
  );
  // «Edit post» comes once the API has said what the post is.
  await screen.findByRole("button", { name: "Edit post" });
  await fireEvent.press(screen.getByRole("button", { name: "Share" }));
  expect(mockOpened.mock.calls[0][0].title).toBe(
    RUN.title ?? whereAndWhat(RUN, RUN.points !== null),
  );
});
