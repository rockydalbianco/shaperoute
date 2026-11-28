import { fireEvent, render, screen } from "@testing-library/react-native";

import type { SavedRun } from "../navigation/trackStore";
import {
  ActivitiesContext,
  type ActivitiesDoor,
  useActivitiesDoor,
} from "./activitiesDoor";
import { RunEnd } from "./RunEnd";

// «Save» at the end of a flight keeps it whole on the phone too, for its
// analysis and its IGC file (TASK-479 part F1); a run does not.

jest.mock("expo-file-system");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
let mockSport = "paragliding";
jest.mock("../settings/useSport", () => ({ useSport: () => mockSport }));
jest.mock("../air/flightArchive", () => ({
  ...jest.requireActual("../air/flightArchive"),
  keepFlight: jest.fn(() => true),
}));
const T0 = Date.UTC(2026, 6, 14, 10, 0, 0);
const FLIGHT: SavedRun = {
  version: 1,
  route: [],
  status: "stopped",
  track: {
    distanceM: 20,
    fixes: [
      { point: [45.72, 10.84], timeMs: T0, accuracyM: 5, altitudeM: 1700 },
      { point: [45.7202, 10.84], timeMs: T0 + 1000, accuracyM: 5, altitudeM: 1702 },
    ],
  },
};
jest.mock("../navigation/trackStore", () => ({
  ...jest.requireActual("../navigation/trackStore"),
  loadRun: () => FLIGHT,
}));

const { keepFlight } = jest.requireMock<{ keepFlight: jest.Mock }>(
  "../air/flightArchive",
);

beforeEach(() => {
  keepFlight.mockClear();
  mockSport = "paragliding";
});

function WithDoor({
  door,
  onSave,
}: {
  door: Partial<ActivitiesDoor>;
  onSave: () => boolean;
}) {
  const nothing = useActivitiesDoor();
  return (
    <ActivitiesContext.Provider value={{ ...nothing, signedIn: true, ...door }}>
      <RunEnd onSave={onSave} onDiscard={jest.fn()} health={null} sleep={null} />
    </ActivitiesContext.Provider>
  );
}

async function save(onSave: () => boolean) {
  await render(<WithDoor door={{ toDrawing: jest.fn() }} onSave={onSave} />);
  await fireEvent.press(screen.getByRole("button", { name: "Save to My activities" }));
}

test("a flight saved is kept whole on the phone", async () => {
  await save(() => true);
  expect(keepFlight).toHaveBeenCalledTimes(1);
  const [source, fixes] = keepFlight.mock.calls[0] as [
    string,
    { altM: number | null }[],
  ];
  expect(source).toBe("muw");
  expect(fixes.map((fix) => fix.altM)).toEqual([1700, 1702]);
});

test("a flight the phone could not save is not kept", async () => {
  await save(() => false);
  expect(keepFlight).not.toHaveBeenCalled();
});

test("a run is not kept as a flight", async () => {
  mockSport = "run";
  await save(() => true);
  expect(keepFlight).not.toHaveBeenCalled();
});
