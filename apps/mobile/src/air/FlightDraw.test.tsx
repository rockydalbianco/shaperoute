/**
 * «Draw» with «Paragliding» (TASK-305 part R2): only the yellow «Record
 * your flight» and the flight's own line under it, in the words the user
 * approved on 2026-11-12; never the slopes' line.
 */
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { translate } from "../i18n/translate";
import { ChooseScreen } from "../screens/ChooseScreen";
import { withoutRouteIcon } from "../screens/RunNoRouteButton";
import { withoutRouteLabel } from "../settings/sport";

jest.mock("../settings/useSport", () => ({ useSport: () => "paragliding" }));

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const LINE = "No shapes in the air yet: MuW records your flight.";

test("a flight is recorded from «Record your flight», with its own line", async () => {
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
      runLabel={withoutRouteLabel("paragliding")}
      runIcon={withoutRouteIcon("paragliding")}
    >
      <Text>Shapes</Text>
    </ChooseScreen>,
  );
  expect(screen.getByText(LINE)).toBeOnTheScreen();
  expect(
    screen.queryByText("No shapes on the slopes: MuW records your day."),
  ).toBeNull();
  expect(screen.getByText("🪂")).toBeOnTheScreen();
  expect(screen.queryByText("Shapes")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Record your flight" }));
  expect(onRun).toHaveBeenCalledTimes(1);
});

test("the flight's words, in each language", () => {
  expect(
    (["it", "de", "fr", "es"] as const).map((language) => translate(language, LINE)),
  ).toEqual([
    "Niente forme in volo, per ora: MuW registra il tuo volo.",
    "Noch keine Formen in der Luft: MuW zeichnet deinen Flug auf.",
    "Pas encore de formes en vol : MuW enregistre votre vol.",
    "Todavía no hay formas en el aire: MuW registra tu vuelo.",
  ]);
});
