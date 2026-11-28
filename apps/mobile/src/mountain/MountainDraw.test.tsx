/**
 * «Draw» with «Mountaineering» (TASK-463 part B): only the yellow «Record
 * your day» and the mountain's own line under it, in the words the user
 * approved on 2026-11-12 after the screenshots; never the slopes' line.
 */
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { translate } from "../i18n/translate";
import { ChooseScreen } from "../screens/ChooseScreen";
import { withoutRouteIcon } from "../screens/RunNoRouteButton";
import { withoutRouteLabel } from "../settings/sport";

jest.mock("../settings/useSport", () => ({ useSport: () => "alpinism" }));

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const LINE = "No shapes up a mountain: MuW records your day.";

test("a day of mountaineering is recorded from «Record your day», with its own line", async () => {
  const onRun = jest.fn();
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
      runLabel={withoutRouteLabel("alpinism")}
      runIcon={withoutRouteIcon("alpinism")}
    >
      <Text>Shapes</Text>
    </ChooseScreen>,
  );
  expect(screen.getByText(LINE)).toBeOnTheScreen();
  expect(
    screen.queryByText("No shapes on the slopes: MuW records your day."),
  ).toBeNull();
  expect(
    screen.getByTestId("sport-icon-alpinism", { includeHiddenElements: true }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Shapes")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Record your day" }));
  expect(onRun).toHaveBeenCalledTimes(1);
});

test("the mountain's words, in each language", () => {
  expect(
    (["it", "de", "fr", "es"] as const).map((language) => translate(language, LINE)),
  ).toEqual([
    "Niente forme in montagna: MuW registra la tua giornata.",
    "Keine Formen am Berg: MuW zeichnet deinen Tag auf.",
    "Pas de formes en montagne : MuW enregistre ta journée.",
    "Sin formas en la montaña: MuW registra tu jornada.",
  ]);
});
