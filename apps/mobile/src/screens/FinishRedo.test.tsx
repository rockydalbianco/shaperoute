import scoreRequest from "@shaperoute/shared-types/fixtures/track-score-request.json";
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { translate } from "../i18n/translate";
import type { ScorableRun } from "../navigation/trackStore";
import { FinishCard } from "./FinishScreen";

// «Redo better» (TASK-451, ADR-0419): on the end card of a run that left its
// route, the button that opens «Draw» with the same shape again.

const RUN: ScorableRun = {
  version: 1,
  route: scoreRequest.points as LatLon[],
  similarity: scoreRequest.similarity,
  status: "arrived",
  track: {
    distanceM: 4007,
    fixes: scoreRequest.track.map((fix) => ({
      point: fix.point as LatLon,
      timeMs: fix.time_ms,
      accuracyM: fix.accuracy_m,
    })),
  },
};

test("without a redo the card has no such button", async () => {
  await render(<FinishCard run={RUN} />);
  expect(screen.queryByText("Save & redo")).toBeNull();
  expect(screen.queryByText("Redo")).toBeNull();
});

test("with an account it says it saves, and the tap is the redo's", async () => {
  const onPress = jest.fn();
  await render(<FinishCard run={RUN} redo={{ saves: true, onPress }} />);
  const button = screen.getByLabelText("Save the run and draw the same shape again");
  expect(screen.getByText("Save & redo")).toBeTruthy();
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("with nobody signed in it only redoes, beside Done", async () => {
  const onPress = jest.fn();
  const onDone = jest.fn();
  await render(
    <FinishCard run={RUN} onDone={onDone} redo={{ saves: false, onPress }} />,
  );
  expect(screen.getByText("Redo")).toBeTruthy();
  expect(screen.queryByText("Save & redo")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Draw the same shape again"));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(onDone).not.toHaveBeenCalled();
});

test("the texts the user approved, in the four languages", () => {
  const approved = {
    it: [
      "Salva e rifai",
      "Rifai",
      "Salva la corsa e disegna di nuovo la stessa forma",
      "Disegna di nuovo la stessa forma",
    ],
    de: [
      "Speichern & wiederholen",
      "Wiederholen",
      "Lauf speichern und dieselbe Form neu zeichnen",
      "Dieselbe Form neu zeichnen",
    ],
    es: [
      "Guardar y repetir",
      "Repetir",
      "Guarda la carrera y dibuja otra vez la misma forma",
      "Dibuja otra vez la misma forma",
    ],
    fr: [
      "Enregistrer et refaire",
      "Refaire",
      "Enregistre la course et redessine la même forme",
      "Redessine la même forme",
    ],
  } as const;
  const keys = [
    "Save & redo",
    "Redo@@run",
    "Save the run and draw the same shape again",
    "Draw the same shape again",
  ];
  for (const [language, texts] of Object.entries(approved)) {
    expect(
      keys.map((key) => translate(language as keyof typeof approved, key)),
    ).toEqual(texts);
  }
  // The «Redo» of the strokes in «Draw on the map» stays its own.
  expect(translate("it", "Redo")).toBe("Ripeti");
  expect(translate("en", "Redo@@run")).toBe("Redo");
});
