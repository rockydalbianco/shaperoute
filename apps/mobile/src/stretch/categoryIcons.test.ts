import { existsSync } from "fs";
import { join } from "path";

import { CATEGORIES } from "./categories";
import { MOMENT_ICONS, SPORT_ICONS } from "./categoryIcons";
import { SPORT_NAMES } from "./categoryText";

const ICONS = join(__dirname, "..", "..", "assets", "ui", "icons");

describe("the signs of the stretching tiles", () => {
  it("give every moment of the day one", () => {
    const moments = CATEGORIES.filter((c) => c.group === "moments").map((c) => c.key);
    expect(Object.keys(MOMENT_ICONS).sort()).toEqual([...moments].sort());
  });

  it("give every sport one but the rackets", () => {
    const sports = Object.keys(SPORT_NAMES).filter((sport) => sport !== "racket");
    expect(Object.keys(SPORT_ICONS).sort()).toEqual(sports.sort());
  });

  it("are files at three densities, with Lucide's licence beside them", () => {
    for (const name of [
      "sunrise",
      "laptop",
      "armchair",
      "plane",
      "person-standing",
      "wind",
      "footprints",
      "bike",
      "waves-ladder",
      "mountain-snow",
      "snowflake",
      "mountain",
      "motorbike",
      "backpack",
      "pickaxe",
      "kayak",
      "volleyball",
      "land-plot",
    ]) {
      for (const density of ["", "@2x", "@3x"]) {
        expect({
          name,
          density,
          there: existsSync(join(ICONS, `${name}${density}.png`)),
        }).toEqual({
          name,
          density,
          there: true,
        });
      }
    }
    expect(existsSync(join(ICONS, "LICENSE-lucide.txt"))).toBe(true);
  });
});
