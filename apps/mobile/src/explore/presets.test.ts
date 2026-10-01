import {
  CATEGORIES,
  cityShort,
  exampleFor,
  FEATURED_CITIES,
  requestFor,
} from "./presets";
import { MAX_RECENT, remember } from "./recentCities";

const milan = {
  label: "Milan, Lombardy, Italy",
  point: [45.4642, 9.1896] as [number, number],
};

test("cities from several countries, Food the first category", () => {
  expect(FEATURED_CITIES).toEqual(
    expect.arrayContaining(["New York", "Tokyo", "Dubai", "Torino"]),
  );
  expect(CATEGORIES[0]).toBe("Food");
  expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
});

test("requests and examples follow the city", () => {
  expect(cityShort(milan.label)).toBe("Milan");
  expect(requestFor("Best Views", milan)).toBe("Best Views in Milan");
  expect(requestFor("Food", null)).toBe("Food");
  expect(exampleFor(milan)).toMatch(/in Milan/);
});

test("the recent cities: the last first, once each, a few", () => {
  const cities = Array.from({ length: 8 }, (_, i) => ({
    ...milan,
    label: `City ${i}`,
  }));
  const recent = cities.reduce(
    (list, city) => remember(list, city),
    [] as typeof cities,
  );
  expect(recent.length).toBe(MAX_RECENT);
  expect(recent[0].label).toBe("City 7");
  expect(remember(recent, recent[3])[0]).toBe(recent[3]);
  expect(remember(recent, recent[3]).length).toBe(MAX_RECENT);
});
