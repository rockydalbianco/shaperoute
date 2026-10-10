import { TABLES } from "../i18n/translate";
import { LANGUAGES } from "../i18n/languages";
import { TOUR_STEPS } from "./tourSteps";
import { stepOf, TOUR_TEXTS } from "./tourTexts";

/** A button's name as the app shows it in `language`. */
function named(language: string, english: string): string {
  return language === "en"
    ? english
    : (TABLES[language as keyof typeof TABLES][english] ?? english);
}

test.each(LANGUAGES.map((option) => option.id))(
  "every step has its words in %s",
  (language) => {
    const texts = TOUR_TEXTS[language];
    for (const step of TOUR_STEPS) {
      expect(texts.steps[step.id].title.trim()).not.toBe("");
      expect(texts.steps[step.id].body.trim()).not.toBe("");
    }
    for (const word of [
      texts.shapeOnWater,
      texts.next,
      texts.done,
      texts.skip,
      texts.guide,
      texts.watch,
    ]) {
      expect(word.trim()).not.toBe("");
    }
    expect(stepOf(texts, 2, 8)).toMatch(/2.*8/);
  },
);

test.each(LANGUAGES.map((option) => option.id))(
  "in %s the tour names the buttons as the app does",
  (language) => {
    const { steps } = TOUR_TEXTS[language];
    expect(steps.draw.title).toBe(named(language, "Draw route"));
    expect(steps.explore.title).toBe(named(language, "Explore"));
    expect(steps.feed.title).toBe(named(language, "Feed"));
    expect(steps.draw.body).toContain(named(language, "Start"));
    expect(steps.shape.body).toContain(named(language, "Word"));
    expect(steps.shape.body).toContain(named(language, "Image"));
  },
);
