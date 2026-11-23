/**
 * «Swim» in «Draw» (TASK-400 part B, the user's choices of 2026-11-05/06):
 * «Open water» as before, or «Pool» with 25 m, 50 m or «Other» from 10 to
 * 100 m and «Start swim»; the last choice comes back; the texts in each
 * language.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { translate } from "../i18n/translate";
import { ChooseScreen } from "../screens/ChooseScreen";
import type { Sport } from "../settings/sport";
import { loadPoolChoice, savePlace } from "./poolChoice";
import { forgetHeldPoolSwim } from "./usePoolSwim";
import { loadPoolSwim } from "./poolStore";

let mockSport: Sport = "swim";
jest.mock("../settings/useSport", () => ({ useSport: () => mockSport }));
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

beforeEach(() => {
  files.clear();
  forgetHeldPoolSwim();
  mockSport = "swim";
});

async function draw(onRun = jest.fn()) {
  await render(
    <ChooseScreen
      status="From your position"
      denied={false}
      mode="gps"
      onMode={jest.fn()}
      searching={false}
      onPlace={jest.fn()}
      near={null}
      mapError={null}
      footer={<Text>Draw route</Text>}
      onRun={onRun}
      runLabel="Swim without a route"
    >
      <Text>Shapes</Text>
    </ChooseScreen>,
  );
  return onRun;
}

test("«Open water» is as before: the start, the shapes, the route", async () => {
  await draw();
  expect(
    screen.getByRole("button", { name: "Open water", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByText("START")).toBeOnTheScreen();
  expect(screen.getByText("Shapes")).toBeOnTheScreen();
  expect(screen.getByTestId("draw-footer")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Swim without a route" }),
  ).toBeOnTheScreen();
  expect(screen.queryByTestId("pool-draw")).toBeNull();
});

test("«Pool»: the pool and «Start swim», no start, no shape, no route", async () => {
  const onRun = await draw();
  await fireEvent.press(screen.getByRole("button", { name: "Pool" }));
  expect(loadPoolChoice().place).toBe("pool");
  expect(screen.getByText("Pool length")).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "25 m" })).toBeChecked();
  expect(screen.queryByText("START")).toBeNull();
  expect(screen.queryByText("Shapes")).toBeNull();
  expect(screen.queryByTestId("draw-footer")).toBeNull();
  expect(screen.queryByRole("button", { name: "Swim without a route" })).toBeNull();

  await fireEvent.press(screen.getByRole("radio", { name: "50 m" }));
  await fireEvent.press(screen.getByTestId("start-pool-swim"));
  expect(loadPoolSwim()).toMatchObject({ poolLengthM: 50, endedMs: null });
  expect(onRun).not.toHaveBeenCalled();
});

test("«Other» takes 10 to 100 m; out of it «Start swim» waits", async () => {
  savePlace("pool");
  await draw();
  await fireEvent.press(screen.getByRole("radio", { name: "Other" }));
  const field = screen.getByLabelText("Length in meters");
  const start = screen.getByTestId("start-pool-swim");
  await fireEvent.changeText(field, "120");
  expect(start).toBeDisabled();
  await fireEvent.changeText(field, "9");
  expect(start).toBeDisabled();
  await fireEvent.changeText(field, "33,33");
  expect(start).toBeEnabled();
  expect(loadPoolChoice().poolLengthM).toBe(33.33);
  await fireEvent.press(start);
  expect(loadPoolSwim()?.poolLengthM).toBe(33.33);
});

test("the last pool comes back the next time, «Other» too", async () => {
  savePlace("pool");
  await draw();
  await fireEvent.press(screen.getByRole("radio", { name: "Other" }));
  await fireEvent.changeText(screen.getByLabelText("Length in meters"), "20");
  await act(async () => screen.unmount());
  await draw();
  expect(screen.getByRole("radio", { name: "Other" })).toBeChecked();
  expect(screen.getByLabelText("Length in meters")).toHaveDisplayValue("20");
});

test("another sport has no «Open water» / «Pool»", async () => {
  mockSport = "run";
  await draw();
  expect(screen.queryByRole("button", { name: "Pool" })).toBeNull();
});

test("the approved texts, in each language", () => {
  const texts = [
    "Swim",
    "Open water",
    "Pool",
    "Pool length",
    "Other",
    "Length in meters",
    "Start swim",
    "How many lengths?",
    "Lengths",
    "Pool swim",
    "Pace /100 m",
  ];
  expect(texts.map((text) => translate("it", text))).toEqual([
    "Nuoto",
    "Acque libere",
    "Piscina",
    "Lunghezza vasca",
    "Altro",
    "Lunghezza in metri",
    "Inizia a nuotare",
    "Quante vasche?",
    "Vasche",
    "Nuoto in piscina",
    "Passo /100 m",
  ]);
  expect(translate("de", "How many lengths?")).toBe("Wie viele Bahnen?");
  expect(translate("fr", "How many lengths?")).toBe("Combien de longueurs ?");
  expect(translate("es", "How many lengths?")).toBe("¿Cuántos largos?");
  expect(translate("es", "Other")).toBe("Otra");
});
