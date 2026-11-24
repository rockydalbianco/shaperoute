import { saveLanguageChoice } from "../i18n/language";
import { headingLabel } from "./headingLabel";

// «NE · 42°» under the north arrow on «Compass» (TASK-518 B).

afterEach(() => saveLanguageChoice("phone"));

test("the nearest point and the whole degrees", () => {
  expect(headingLabel(42)).toBe("NE · 42°");
  expect(headingLabel(0)).toBe("N · 0°");
  expect(headingLabel(181.6)).toBe("S · 182°");
  expect(headingLabel(359.6)).toBe("N · 0°");
  expect(headingLabel(-90)).toBe("W · 270°");
});

test("north up: only «N»", () => {
  expect(headingLabel(null)).toBe("N");
});

test("in the app's language", () => {
  saveLanguageChoice("it");
  expect(headingLabel(225)).toBe("SO · 225°");
  expect(headingLabel(270)).toBe("O · 270°");
});
