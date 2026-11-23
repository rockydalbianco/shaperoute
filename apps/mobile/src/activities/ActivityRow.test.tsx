import activities from "@shaperoute/shared-types/fixtures/activities.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { Activity } from "../api/activities";
import { ActivityRow } from "./ActivityRow";
import { startedLabel } from "./activityText";

// A run in the list of «My activities» (TASK-456): headed by the title of
// its post when it has one, and with «Delete» in its «…», not in sight.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const STAR = activities.activities[0] as unknown as Activity;
const WHEN = startedLabel(STAR.started_at);
const FACTS = "Trento · Star, 4.01 km · 19:00 · 4:45 /km";

function row(title: string | null, isPublic = false) {
  const onOpen = jest.fn();
  const onDelete = jest.fn();
  return {
    onOpen,
    onDelete,
    shown: render(
      <ActivityRow
        activity={STAR}
        isPublic={isPublic}
        title={title}
        opening={false}
        onOpen={onOpen}
        onDelete={onDelete}
      />,
    ),
  };
}

test("a run whose post has a title is headed by it, with the day and the time under it", async () => {
  const { onOpen, shown } = row("My first star", true);
  await shown;
  expect(screen.getByTestId("activity-heading")).toHaveTextContent("My first star");
  expect(screen.getByText(WHEN)).toBeOnTheScreen();
  expect(screen.getByText("Trento · Star")).toBeOnTheScreen();
  // A screen reader hears the title first, then the run as before.
  await fireEvent.press(
    screen.getByRole("button", {
      name: `My first star, ${WHEN}, ${FACTS}, public, open on the map`,
    }),
  );
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("a run without a post, or with a post without a title, is headed by its day as before", async () => {
  await row(null).shown;
  expect(screen.getByTestId("activity-heading")).toHaveTextContent(WHEN);
  // Once: not under itself too.
  expect(screen.getAllByText(WHEN)).toHaveLength(1);
  expect(
    screen.getByRole("button", { name: `${WHEN}, ${FACTS}, open on the map` }),
  ).toBeOnTheScreen();
});

test("«Delete» is in the «…» of the row, and asks before the run goes", async () => {
  const { onDelete, shown } = row("My first star");
  await shown;
  expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  // The «…» says which run it is of.
  const more = screen.getByRole("button", { name: "More" });
  expect(more.props.accessibilityHint).toBe("My first star");

  await fireEvent.press(more);
  await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  expect(screen.getByText("Delete this run? It cannot be undone.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Keep it" }));
  await waitFor(() =>
    expect(screen.queryByText("Delete this run? It cannot be undone.")).toBeNull(),
  );
  expect(onDelete).not.toHaveBeenCalled();

  // Opened again it starts from its choices, not from the question.
  await fireEvent.press(screen.getByRole("button", { name: "More" }));
  expect(screen.queryByText("Delete this run? It cannot be undone.")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull(),
  );
  expect(onDelete).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole("button", { name: "More" }));
  await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  await fireEvent.press(screen.getByRole("button", { name: "Delete run" }));
  expect(onDelete).toHaveBeenCalledTimes(1);
});
