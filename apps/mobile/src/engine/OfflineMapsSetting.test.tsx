import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { files } from "./memoryFiles";
import { OfflineMapsSetting } from "./OfflineMapsSetting";
import { savedZones, touchZone, type ZoneEntry, zoneUri } from "./zones";

jest.mock("expo-file-system", () => jest.requireActual("./memoryFiles"));
jest.mock("expo-file-system/legacy", () => ({}));

const TRENTO = "foot_45.98370_11.00140_46.15030_11.24160.zone.json.gz";
const TRENTO_BIKE = "bike_45.98280_10.99990_46.15140_11.24290.zone.json.gz";

/** Zones saved on the phone, as the downloads leave them. */
function saveZones(zones: ZoneEntry[]): void {
  files.set("file:///documents/engine/zones.json", JSON.stringify({ zones }));
  for (const zone of zones) {
    files.set(zoneUri(zone), "zone");
  }
}

beforeEach(() => {
  files.clear();
});

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("the space the zones take, with «Delete», and how they download", async () => {
  saveZones([
    { name: TRENTO, etag: null, bytes: 700_000_000, usedAt: 1 },
    { name: TRENTO_BIKE, etag: null, bytes: 530_000_000, usedAt: 2 },
  ]);
  await render(<OfflineMapsSetting />);
  expect(screen.getByText("Offline maps: 1.2 GB")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Delete" })).toBeOnTheScreen();
  expect(screen.getByText("Maps download on Wi-Fi and mobile data.")).toBeOnTheScreen();
});

test("«Delete» removes every zone, and the row says so", async () => {
  saveZones([{ name: TRENTO, etag: null, bytes: 19_000_000, usedAt: 1 }]);
  await render(<OfflineMapsSetting />);
  expect(screen.getByText("Offline maps: 19 MB")).toBeOnTheScreen();
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  });
  expect(savedZones()).toEqual([]);
  expect(screen.getByText("Offline maps: 0 MB")).toBeOnTheScreen();
  // Nothing left to delete.
  expect(screen.queryByRole("button")).toBeNull();
});

test("the size follows the zones while the page is open", async () => {
  await render(<OfflineMapsSetting />);
  expect(screen.getByText("Offline maps: 0 MB")).toBeOnTheScreen();
  await act(async () => {
    saveZones([{ name: TRENTO, etag: null, bytes: 7_000_000, usedAt: 1 }]);
    // Any change of the index tells the page.
    touchZone(TRENTO, 2);
  });
  expect(screen.getByText("Offline maps: 7 MB")).toBeOnTheScreen();
});

test("the row is in the app's language", async () => {
  await act(async () => saveLanguageChoice("it"));
  saveZones([{ name: TRENTO, etag: null, bytes: 1_230_000_000, usedAt: 1 }]);
  await render(<OfflineMapsSetting />);
  expect(screen.getByText("Mappe offline: 1,2 GB")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Elimina" })).toBeOnTheScreen();
  expect(
    screen.getByText("Le mappe si scaricano con il Wi-Fi e con i dati mobili."),
  ).toBeOnTheScreen();
});
