import { phoneMeasures, phoneUnits, unitsOfLocale } from "./phoneUnits";

test("a phone of the United States or the United Kingdom measures in miles", () => {
  expect(phoneUnits({ locales: ["en_US"] })).toBe("mi");
  expect(phoneUnits({ locales: ["en_GB"] })).toBe("mi");
  expect(phoneUnits({ locales: ["es-US"] })).toBe("mi");
  // Liberia and Myanmar: the US system, as iOS counts them.
  expect(phoneUnits({ locales: ["en_LR"] })).toBe("mi");
  expect(phoneUnits({ locales: ["my_MM"] })).toBe("mi");
});

test("every other phone measures in kilometres", () => {
  expect(phoneUnits({ locales: ["it_IT"] })).toBe("km");
  expect(phoneUnits({ locales: ["en_IT"] })).toBe("km");
  expect(phoneUnits({ locales: ["en_CA"] })).toBe("km");
  expect(phoneUnits({ locales: ["zh_Hans_CN"] })).toBe("km");
  expect(phoneUnits({ locales: ["de-Latn-DE"] })).toBe("km");
});

test("the measurement system set by hand on iOS comes before the region", () => {
  // «Metric» on a phone of the United States.
  expect(
    phoneUnits({ metric: true, measurement: "Centimeters", locales: ["en_US"] }),
  ).toBe("km");
  // «US» on an Italian phone: not metric.
  expect(phoneUnits({ metric: false, measurement: "Inches", locales: ["it_IT"] })).toBe(
    "mi",
  );
  // «UK»: metric with inches, and the roads in miles.
  expect(phoneUnits({ metric: true, measurement: "Inches", locales: ["it_IT"] })).toBe(
    "mi",
  );
  // The settings may give numbers for yes and no.
  expect(phoneUnits({ metric: 0, locales: ["it_IT"] })).toBe("mi");
  expect(phoneUnits({ metric: 1, locales: ["en_US"] })).toBe("km");
  // Only one of the two.
  expect(phoneUnits({ measurement: "Inches", locales: ["it_IT"] })).toBe("mi");
  expect(phoneUnits({ measurement: "Centimeters", locales: ["en_US"] })).toBe("km");
});

test("a locale that names its measurement system, or another region, is believed", () => {
  expect(unitsOfLocale("en_US@measure=metric")).toBe("km");
  expect(unitsOfLocale("it_IT@measure=ussystem")).toBe("mi");
  expect(unitsOfLocale("it_IT@calendar=gregorian;measure=uksystem")).toBe("mi");
  expect(unitsOfLocale("en-US-u-ms-metric")).toBe("km");
  expect(unitsOfLocale("it-IT-u-ca-gregory-ms-uksystem")).toBe("mi");
  // The region set over the language's own.
  expect(unitsOfLocale("en_GB@rg=dezzzz")).toBe("km");
  expect(unitsOfLocale("it_IT@rg=uszzzz")).toBe("mi");
  expect(unitsOfLocale("en-DE-u-rg-uszzzz")).toBe("mi");
});

test("the first locale that says something decides; none, kilometres", () => {
  expect(unitsOfLocale("en")).toBeNull();
  expect(unitsOfLocale("es_419")).toBeNull();
  expect(unitsOfLocale("")).toBeNull();
  expect(phoneUnits({ locales: ["en", "en_US", "it_IT"] })).toBe("mi");
  expect(phoneUnits({ locales: ["en"] })).toBe("km");
  expect(phoneUnits({ locales: [] })).toBe("km");
  // Something else in the settings is no answer.
  expect(phoneUnits({ metric: "yes", measurement: 3, locales: [] })).toBe("km");
});

test("in tests the phone says nothing, so every test sees kilometres", () => {
  expect(phoneMeasures()).toEqual({ locales: [] });
  expect(phoneUnits()).toBe("km");
});
