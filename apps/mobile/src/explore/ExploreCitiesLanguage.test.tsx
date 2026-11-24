import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import type { Place } from "../places/photon";
import { CityPicker } from "./ExploreTools";
import { FEATURED_CITIES } from "./presets";

// The cities to tap in «Explore» in the app's language (TASK-508, the
// user's choice of 2026-11-24): «London» stood among Italian words. The
// API is still asked in English, and the phone keeps the city by that name.

const london: Place = {
  label: "London, England, United Kingdom",
  point: [51.5, -0.12],
};

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("in English the chips are as they were", async () => {
  await render(<CityPicker apiUrl="http://api" city={null} onCity={jest.fn()} />);
  for (const name of FEATURED_CITIES) {
    expect(screen.getByText(name)).toBeOnTheScreen();
  }
});

test.each([
  ["it", ["Londra", "Parigi", "Roma", "Milano", "Barcellona", "Berlino", "Lisbona"]],
  ["de", ["London", "Rom", "Mailand", "Tokio", "Lissabon", "Turin"]],
  ["fr", ["Londres", "Rome", "Milan", "Barcelone", "Lisbonne", "Dubaï"]],
  ["es", ["Londres", "Roma", "Milán", "Nueva York", "Tokio", "Sídney"]],
] as const)("in «%s» the cities are written in it", async (language, names) => {
  await act(async () => saveLanguageChoice(language));
  await render(<CityPicker apiUrl="http://api" city={null} onCity={jest.fn()} />);
  for (const name of names) {
    expect(screen.getByText(name)).toBeOnTheScreen();
  }
});

test("«Londra» asks the API for «London», keeps it by that name, and waits as «Londra …»", async () => {
  await act(async () => saveLanguageChoice("it"));
  let answer: (response: Response) => void = () => {};
  const fetchFn = jest.fn(
    (input: RequestInfo | URL) =>
      new Promise<Response>((resolve) => {
        if (String(input).includes("/cities")) {
          answer = resolve;
        } else {
          resolve(new Response(null, { status: 204 }));
        }
      }),
  );
  const onCity = jest.fn();
  const featured = { read: () => null, keep: jest.fn() };
  await render(
    <CityPicker
      apiUrl="http://api"
      city={null}
      onCity={onCity}
      fetchFn={fetchFn as unknown as typeof fetch}
      featured={featured}
    />,
  );
  expect(screen.queryByText("London")).toBeNull();
  await fireEvent.press(screen.getByText("Londra"));
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/cities?q=London");
  expect(screen.getByText("Londra …")).toBeOnTheScreen();
  await act(async () => answer(Response.json({ places: [london] })));
  expect(onCity).toHaveBeenCalledWith(london);
  expect(featured.keep).toHaveBeenCalledWith("London", london);
});

test("the city chosen is the chip that is on, whatever the language", async () => {
  await act(async () => saveLanguageChoice("it"));
  await render(<CityPicker apiUrl="http://api" city={london} onCity={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Londra" })).toBeSelected();
  expect(screen.getByRole("button", { name: "Parigi" })).not.toBeSelected();
});
