import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { AddFoodSheet } from "./AddFoodSheet";
import { loadOwnFoods } from "./nutritionStore";
import { productUrl } from "./openFoodFacts";
import type { Portion } from "./plan";
import { forgetNutrition, useNutrition } from "./useNutrition";

// A food by its barcode, from «Add food» (TASK-489 part G1).

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// The phone's documents folder, in memory, as in nutritionStore.test.ts.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } }, files };
});

const disk = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

const CODE = "3017620422003";
const NUTELLA = {
  code: CODE,
  status: 1,
  product: {
    product_name: "Nutella",
    brands: "Ferrero",
    nutriments: { "energy-kcal_100g": 539, proteins_100g: 6.3 },
  },
};
const NOT_THERE = { code: CODE, status: 0, status_verbose: "product not found" };
const NO_KCAL = { code: CODE, status: 1, product: { product_name: "Water" } };

function answering(...bodies: unknown[]) {
  const fetchFn = jest.fn();
  for (const body of bodies) {
    fetchFn.mockImplementationOnce(async () =>
      body === null
        ? Promise.reject(new TypeError("Network request failed"))
        : { ok: true, status: 200, json: async () => body },
    );
  }
  return fetchFn as unknown as jest.MockedFunction<typeof fetch>;
}

const onPortion = jest.fn<void, [Portion]>();

function Sheet({ fetchFn }: { fetchFn: typeof fetch }) {
  const nutrition = useNutrition();
  return (
    <AddFoodSheet
      visible
      meal="snacks"
      ownFoods={nutrition.ownFoods.foods}
      language="en"
      onPortion={onPortion}
      onRemove={() => {}}
      onClose={() => {}}
      fetchFn={fetchFn}
    />
  );
}

async function typeCode(fetchFn: typeof fetch, code = CODE) {
  await render(<Sheet fetchFn={fetchFn} />);
  await fireEvent.press(screen.getByRole("button", { name: "Type the code" }));
  await fireEvent.changeText(screen.getByTestId("barcode-input"), code);
}

afterEach(async () => {
  await act(async () => {
    saveLanguageChoice("phone");
    forgetNutrition();
  });
  disk.files.clear();
  onPortion.mockClear();
});

test("before anything is asked, the step says only the barcode goes out", async () => {
  const fetchFn = answering();
  await typeCode(fetchFn, "");
  expect(screen.getByRole("header", { name: "Type the code" })).toBeOnTheScreen();
  expect(
    screen.getByText("Only the barcode goes to Open Food Facts, to find the product."),
  ).toBeOnTheScreen();
  // Not a barcode yet: nothing to look up.
  expect(screen.getByTestId("barcode-look-up")).toBeDisabled();
  await fireEvent.changeText(screen.getByTestId("barcode-input"), "12345");
  expect(screen.getByTestId("barcode-look-up")).toBeDisabled();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("a product found shows its name, its calories and where they come from", async () => {
  const fetchFn = answering(NUTELLA);
  await typeCode(fetchFn);
  await fireEvent.press(screen.getByTestId("barcode-look-up"));
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(fetchFn.mock.calls[0][0]).toBe(productUrl(CODE));
  expect(await screen.findByRole("header", { name: "Nutella" })).toBeOnTheScreen();
  expect(screen.getByTestId("barcode-from")).toHaveTextContent("from Open Food Facts");
  expect(screen.getByText("539 kcal / 100 g")).toBeOnTheScreen();
  expect(screen.getByText(`Barcode ${CODE}`)).toBeOnTheScreen();
  expect(
    screen.getByText("Check the numbers against the label: you can correct them."),
  ).toBeOnTheScreen();
  // Nothing is kept until the user takes it.
  expect(loadOwnFoods().foods).toEqual([]);
});

test("«Use this food» keeps it among the user's foods and goes on to its grams", async () => {
  await typeCode(answering(NUTELLA));
  await fireEvent.press(screen.getByTestId("barcode-look-up"));
  await fireEvent.press(await screen.findByTestId("barcode-use"));
  expect(loadOwnFoods().foods).toEqual([
    expect.objectContaining({
      key: "own-1",
      name: "Nutella",
      kcalPer100g: 539,
      proteinPer100g: 6.3,
      source: "own",
      barcode: CODE,
      fromOpenFoodFacts: true,
    }),
  ]);
  expect(screen.getByText("539 kcal / 100 g · from Open Food Facts")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByTestId("add-food-grams-input"), "20");
  await fireEvent.press(screen.getByTestId("add-food-confirm"));
  expect(onPortion).toHaveBeenCalledWith({
    food: expect.objectContaining({ barcode: CODE }),
    grams: 20,
  });
});

test("a code the phone already has is found there, with no request", async () => {
  const first = answering(NUTELLA);
  await typeCode(first);
  await fireEvent.press(screen.getByTestId("barcode-look-up"));
  await fireEvent.press(await screen.findByTestId("barcode-use"));
  // Back to the search, and the same code again.
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  await fireEvent.press(screen.getByRole("button", { name: "Type the code" }));
  await fireEvent.changeText(screen.getByTestId("barcode-input"), "3017 6204 22003");
  await fireEvent.press(screen.getByTestId("barcode-look-up"));
  expect(screen.getByRole("header", { name: "Nutella" })).toBeOnTheScreen();
  expect(first).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByTestId("barcode-use"));
  // The same food, not a second one.
  expect(loadOwnFoods().foods).toHaveLength(1);
});

test("«Edit» keeps the product and opens it: rewritten, its numbers are the user's", async () => {
  await typeCode(answering(NUTELLA));
  await fireEvent.press(screen.getByTestId("barcode-look-up"));
  await fireEvent.press(await screen.findByTestId("barcode-edit"));
  expect(screen.getByRole("header", { name: "My own food" })).toBeOnTheScreen();
  expect(screen.getByTestId("own-food-name")).toHaveProp("value", "Nutella");
  await fireEvent.changeText(screen.getByTestId("own-food-kcal"), "546");
  await fireEvent.press(screen.getByTestId("own-food-save"));
  const [food] = loadOwnFoods().foods;
  expect(food).toMatchObject({ kcalPer100g: 546, barcode: CODE });
  expect(food).not.toHaveProperty("fromOpenFoodFacts");
  expect(screen.getByText("546 kcal / 100 g")).toBeOnTheScreen();
});

test("a product that is not there is written by the user, with its code", async () => {
  await typeCode(answering(NOT_THERE));
  await fireEvent.press(screen.getByTestId("barcode-look-up"));
  expect(await screen.findByTestId("barcode-problem")).toHaveTextContent(
    "This product is not on Open Food Facts.",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Add my own food" }));
  await fireEvent.changeText(screen.getByTestId("own-food-name"), "Crema di nocciole");
  await fireEvent.changeText(screen.getByTestId("own-food-kcal"), "530");
  await fireEvent.press(screen.getByTestId("own-food-save"));
  const [food] = loadOwnFoods().foods;
  expect(food).toMatchObject({ name: "Crema di nocciole", barcode: CODE });
  expect(food).not.toHaveProperty("fromOpenFoodFacts");
});

test("a product without calories says so: MuW makes up no number", async () => {
  await typeCode(answering(NO_KCAL));
  await fireEvent.press(screen.getByTestId("barcode-look-up"));
  expect(await screen.findByTestId("barcode-problem")).toHaveTextContent(
    "Open Food Facts has no calories for this product.",
  );
  expect(screen.getByRole("button", { name: "Add my own food" })).toBeOnTheScreen();
  // «Try again» is another code.
  await fireEvent.press(screen.getByTestId("barcode-again"));
  expect(screen.getByTestId("barcode-input")).toBeOnTheScreen();
});

test("without a network the step says so, and «Try again» asks once more", async () => {
  const fetchFn = answering(null, NUTELLA);
  await typeCode(fetchFn);
  await fireEvent.press(screen.getByTestId("barcode-look-up"));
  expect(await screen.findByTestId("barcode-problem")).toHaveTextContent(
    "The product could not be looked up. Check your connection and try again.",
  );
  // Not known to be missing: nothing to write by hand yet.
  expect(screen.queryByTestId("barcode-own")).toBeNull();
  await fireEvent.press(screen.getByTestId("barcode-again"));
  expect(await screen.findByRole("header", { name: "Nutella" })).toBeOnTheScreen();
  expect(fetchFn).toHaveBeenCalledTimes(2);
});

test("«Cancel» goes back to the search, and nothing was kept", async () => {
  await typeCode(answering(NUTELLA));
  await fireEvent.press(screen.getByTestId("barcode-look-up"));
  await screen.findByTestId("barcode-product");
  await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByTestId("add-food-search")).toBeOnTheScreen();
  expect(loadOwnFoods().foods).toEqual([]);
});
