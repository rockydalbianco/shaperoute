import { CHARACTERS } from "./videoCharacter";
import { FIRST_EDIT, LINE_COLOURS, VIDEO_EMOJI } from "./videoEdit";
import { ENDINGS } from "./videoScenes";
import { VIDEO_STYLES } from "./videoStyle";
import {
  CHARACTER_WORDS,
  EMOJI_WORDS,
  ENDING_WORDS,
  LINE_WORDS,
  readVideoWords,
  STYLE_WORDS,
  withVideoWords,
} from "./videoWords";

const LANGUAGES = ["en", "it", "de", "es", "fr"] as const;

describe("readVideoWords (TASK-408 D)", () => {
  it("reads the field's example in the five languages: a horse, «Night», fireworks at the end", () => {
    for (const example of [
      "a horse at night, fireworks at the end",
      "un cavallo di notte, fuochi d'artificio alla fine",
      "ein Pferd bei Nacht, Feuerwerk am Ende",
      "un caballo de noche, fuegos artificiales al final",
      "un cheval la nuit, un feu d'artifice à la fin",
    ]) {
      expect(readVideoWords(example)).toEqual({
        character: "horse",
        style: "night",
        end: "🎆",
      });
    }
  });

  it("knows a word for every animal, style, colour, emoji and ending, in every language", () => {
    for (const language of LANGUAGES) {
      for (const key of CHARACTERS) {
        expect(CHARACTER_WORDS[key][language].length).toBeGreaterThan(0);
        expect(readVideoWords(CHARACTER_WORDS[key][language][0]).character).toBe(key);
      }
      for (const key of VIDEO_STYLES) {
        expect(readVideoWords(STYLE_WORDS[key][language][0]).style).toBe(key);
      }
      for (const key of LINE_COLOURS) {
        expect(readVideoWords(`${LINE_WORDS[key][language][0]} line`).line).toBe(key);
      }
      for (const key of VIDEO_EMOJI) {
        expect(readVideoWords(EMOJI_WORDS[key][language][0]).along).toBe(key);
      }
      for (const key of ENDINGS) {
        expect(readVideoWords(`finale ${ENDING_WORDS[key][language][0]}`).ending).toBe(
          key,
        );
      }
    }
  });

  it("knows the elephant (B2)", () => {
    expect(readVideoWords("un elefante di notte")).toEqual({
      character: "elephant",
      style: "night",
    });
    expect(readVideoWords("Éléphant")).toEqual({ character: "elephant" });
  });

  it("reads the longer name first: a white horse, not a horse and a white line", () => {
    expect(readVideoWords("cavallo bianco")).toEqual({ character: "white_horse" });
    expect(readVideoWords("White horse, white line")).toEqual({
      character: "white_horse",
      line: "white",
    });
  });

  it("does not count accents, capitals and apostrophes", () => {
    expect(readVideoWords("CERF, ÉTOILES")).toEqual({ character: "stag", along: "⭐" });
    expect(readVideoWords("l'âne")).toEqual({ character: "donkey" });
    expect(readVideoWords("Weißes Pferd")).toEqual({ character: "white_horse" });
  });

  it("puts an emoji along the way, or at the end where the words say so", () => {
    expect(readVideoWords("stelle lungo il percorso e cuori alla fine")).toEqual({
      along: "⭐",
      end: "❤️",
    });
  });

  it("reads «heart» as the ending's heart where the words speak of the ending, else as the emoji", () => {
    expect(readVideoWords("ending with the heart")).toEqual({ ending: "heart" });
    expect(readVideoWords("finale con il cuore")).toEqual({ ending: "heart" });
    expect(readVideoWords("a heart")).toEqual({ along: "❤️" });
  });

  it("counts an ending only where the words speak of the end", () => {
    expect(readVideoWords("drawing of a fox")).toEqual({ character: "fox" });
    expect(readVideoWords("numbers at the end")).toEqual({ ending: "numbers" });
    expect(readVideoWords("finale con tutti e tre")).toEqual({ ending: "all" });
  });

  it("chooses the camera, and «3D» with it when no style is said", () => {
    expect(readVideoWords("un lupo da dietro")).toEqual({
      character: "wolf",
      camera: "behind",
      style: "3d",
    });
    expect(readVideoWords("night, the camera around")).toEqual({
      style: "night",
      camera: "around",
    });
  });

  it("turns the opening off, keeping a scene on", () => {
    expect(readVideoWords("senza apertura")).toEqual({ noOpening: true });
    const open = { ...FIRST_EDIT, off: [] };
    expect(withVideoWords(open, "no opening").off).toEqual(["opening"]);
    const alone = { ...FIRST_EDIT, off: ["route", "ending"] as const };
    expect(withVideoWords({ ...alone, off: [...alone.off] }, "no opening").off).toEqual(
      ["route", "ending"],
    );
  });

  it("skips the words it does not know, with no error", () => {
    expect(readVideoWords("")).toEqual({});
    expect(readVideoWords("a blorp with zigzags, very quickly")).toEqual({});
    expect(readVideoWords("una zebra blu")).toEqual({ line: "light_blue" });
  });

  it("never makes a place or a line from numbers that look like coordinates", () => {
    for (const text of [
      "46.0700, 11.1200",
      "from 46.07,11.12 to 45.44 12.33",
      "lat 46.07 lon 11.12 radius 5000",
      "[[46.07, 11.12], [46.08, 11.13]]",
      "run 12 km at 5:22 /km",
    ]) {
      expect(readVideoWords(text)).toEqual({});
    }
    // Whatever the words, only the sheet's own choices change.
    const edit = withVideoWords(FIRST_EDIT, "46.07, 11.12 horse stars 3d");
    expect(Object.keys(edit).sort()).toEqual(Object.keys(FIRST_EDIT).sort());
    expect(edit).toEqual({
      ...FIRST_EDIT,
      character: "horse",
      along: "⭐",
      style: "3d",
    });
  });

  it("keeps what the words do not choose", () => {
    const chosen = { ...FIRST_EDIT, character: "fox" as const, line: "pink" as const };
    expect(withVideoWords(chosen, "fireworks at the end")).toEqual({
      ...chosen,
      end: "🎆",
    });
  });
});
