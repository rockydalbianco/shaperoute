/**
 * The airspace warning's sound (TASK-479 part E2): one player, made at the
 * first warning, played from its start each time; silence when the phone
 * cannot play.
 */
import { playAirspaceAlert, resetAirspaceAlertSound } from "./airspaceAlertSound";

const settle = () => new Promise((resolve) => setImmediate(resolve));

it("plays the warning from its start, with one player", async () => {
  const made: { plays: number; seeks: number }[] = [];
  resetAirspaceAlertSound(() => {
    const player = {
      plays: 0,
      seeks: 0,
      play() {
        player.plays += 1;
      },
      seekTo() {
        player.seeks += 1;
        return Promise.resolve();
      },
    };
    made.push(player);
    return player;
  });
  playAirspaceAlert();
  await settle();
  playAirspaceAlert();
  await settle();
  expect(made).toHaveLength(1);
  expect(made[0]).toMatchObject({ plays: 2, seeks: 2 });
});

it("is silent, without an error, when the phone cannot play", () => {
  resetAirspaceAlertSound(() => {
    throw new Error("no audio");
  });
  expect(() => playAirspaceAlert()).not.toThrow();
  expect(() => playAirspaceAlert()).not.toThrow();
});
