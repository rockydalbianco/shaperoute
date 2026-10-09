/**
 * The map in the tone chosen (TASK-263, ADR-0231): its colours come from the
 * tone's palette, and on the light map the route runs on a dark edge, which
 * the dark map does not have.
 */
import type { ToneChoice } from "../theme/tone";

type Loaded = {
  page: string;
  mapPage: typeof import("./mapPage");
  tokens: typeof import("../theme/tokens");
};

/** The map page as the app builds it when opened in `choice`. */
function openedIn(choice: ToneChoice): Loaded {
  let loaded: Loaded | null = null;
  jest.isolateModules(() => {
    jest.doMock("../theme/tone", () => ({
      ...jest.requireActual<typeof import("../theme/tone")>("../theme/tone"),
      loadToneChoice: () => choice,
    }));
    const mapPage = jest.requireActual<typeof import("./mapPage")>("./mapPage");
    const tokens =
      jest.requireActual<typeof import("../theme/tokens")>("../theme/tokens");
    loaded = { page: mapPage.buildMapPage("en"), mapPage, tokens };
  });
  return loaded!;
}

const LIGHT: ToneChoice = { tone: "light", dark: 0, light: 4 };
const DARK: ToneChoice = { tone: "dark", dark: 0, light: 4 };

test("the light map has the light colours, and the route its dark edge", () => {
  const { page, mapPage, tokens } = openedIn(LIGHT);
  expect(tokens.color.background).toBe("#FFFFFF");
  expect(mapPage.MAP_BACKGROUND).toBe(tokens.SHADES.light.brightest.map.background);
  expect(page).toContain(tokens.SHADES.light.brightest.map.water);
  expect(mapPage.ROUTE_CASING).toEqual({
    color: tokens.color.onAccent,
    width: tokens.route.width + 3,
    opacity: 0.85,
  });
  // Under the route and under the part left, each just before its line.
  for (const source of ["route", "route-ahead"]) {
    const edge = page.indexOf(`id: "${source}-casing"`);
    const line = page.indexOf(`id: "${source}",`);
    expect(edge).toBeGreaterThan(-1);
    expect(line).toBeGreaterThan(edge);
    expect(page.slice(edge, line)).toContain(`source: "${source}"`);
  }
  expect(page).toContain(`"line-color": "${tokens.color.onAccent}"`);
});

test("the dark map is as it was: no edge under the yellow", () => {
  const { page, mapPage, tokens } = openedIn(DARK);
  expect(mapPage.ROUTE_CASING).toBeNull();
  expect(page).not.toContain("-casing");
  expect(mapPage.MAP_BACKGROUND).toBe("#0D0E10");
  expect(tokens.statusBarStyle).toBe("light");
});

test("the status bar is dark on the light tone", () => {
  expect(openedIn(LIGHT).tokens.statusBarStyle).toBe("dark");
});
