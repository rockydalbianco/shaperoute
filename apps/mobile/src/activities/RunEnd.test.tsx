import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  ActivitiesContext,
  type ActivitiesDoor,
  useActivitiesDoor,
} from "./activitiesDoor";
import { MAX_WAITING } from "./outbox";
import { RunEnd } from "./RunEnd";

// «Save» on a phone that holds MAX_WAITING runs not sent yet (TASK-257):
// nothing is let go to make room, and the end of the run says what to do.

jest.mock("expo-file-system");

type Door = Partial<ActivitiesDoor>;

function WithDoor({ door }: { door: Door }) {
  const nothing = useActivitiesDoor();
  return (
    <ActivitiesContext.Provider value={{ ...nothing, signedIn: true, ...door }}>
      <RunEnd onSave={() => false} onDiscard={jest.fn()} />
    </ActivitiesContext.Provider>
  );
}

const REFUSED = { id: "a", startedAt: "", distanceM: 0, message: "…" };

async function save(door: Door) {
  await render(<WithDoor door={door} />);
  await fireEvent.press(screen.getByRole("button", { name: "Save to My activities" }));
  return screen.getByRole("alert");
}

test("a full phone with a run the API refused says to discard one", async () => {
  const alert = await save({ full: true, waiting: MAX_WAITING, refused: [REFUSED] });
  expect(alert).toHaveTextContent(
    `The phone holds ${MAX_WAITING} runs not sent yet. Discard one in My activities first.`,
  );
});

test("a full phone of runs waiting for a connection says they go first", async () => {
  const alert = await save({ full: true, waiting: MAX_WAITING, refused: [] });
  expect(alert).toHaveTextContent(
    `The phone holds ${MAX_WAITING} runs not sent yet. They go when there is a connection; then save this one.`,
  );
});

test("a phone that is not full could not write the file", async () => {
  const alert = await save({ full: false, waiting: 3 });
  expect(alert).toHaveTextContent(
    "This run could not be kept on the phone. Try again.",
  );
});
