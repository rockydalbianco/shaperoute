import { SHADES } from "../theme/tokens";
import {
  DAY,
  NIGHT,
  styleName,
  stylePalette,
  styleMap,
  styleRelief,
  VIDEO_STYLES,
} from "./videoStyle";

describe("videoStyle", () => {
  it("offers 2D, Night, Day, then 3D", () => {
    expect(VIDEO_STYLES).toEqual(["2d", "night", "day", "3d"]);
  });

  it("is each tone at its end, whatever tone the app is in; 3D is the night on its hills", () => {
    expect(NIGHT.map).toEqual(SHADES.dark.darkest.map);
    expect(NIGHT.text).toBe(SHADES.dark.darkest.text);
    expect(DAY.map).toEqual(SHADES.light.brightest.map);
    expect(DAY.text).toBe(SHADES.light.brightest.text);
    expect(stylePalette("night")).toBe(NIGHT);
    expect(stylePalette("day")).toBe(DAY);
    expect(stylePalette("3d")).toBe(NIGHT);
    expect(styleRelief("3d")).toBe(true);
    expect(styleRelief("night")).toBe(false);
    expect(styleRelief("day")).toBe(false);
    // «2D»: the night's colours, with no map (TASK-408).
    expect(stylePalette("2d")).toBe(NIGHT);
    expect(styleRelief("2d")).toBe(false);
    expect(styleMap("2d")).toBe(false);
    expect(styleMap("night")).toBe(true);
    expect(styleMap("3d")).toBe(true);
  });

  it("names the styles as the row shows them", () => {
    expect(styleName("night")).toBe("Night");
    expect(styleName("day")).toBe("Day");
    expect(styleName("3d")).toBe("3D");
    expect(styleName("2d")).toBe("2D");
  });
});
