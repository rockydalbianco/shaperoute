import { EN } from "../about/content/en";
import {
  CONTACT,
  lookUpProduct,
  productFrom,
  productUrl,
  userAgent,
} from "./openFoodFacts";

// A product looked up by its barcode on Open Food Facts (TASK-489 part G).

/** An answer as Open Food Facts gives it for a product it has (read on
 * 2026-11-23, cut to what a food needs). */
const NUTELLA = {
  code: "3017620422003",
  status: 1,
  status_verbose: "product found",
  product: {
    product_name: "Nutella",
    brands: "Ferrero, Nutella",
    nutriments: {
      "energy-kcal_100g": 539,
      "energy-kj_100g": 2252,
      energy_100g: 2252,
      proteins_100g: 6.3,
      carbohydrates_100g: 57.5,
      fat_100g: 30.9,
    },
  },
};

function answering(body: unknown, status = 200) {
  return jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as jest.MockedFunction<typeof fetch>;
}

test("the app names itself with its version and the contact it publishes", () => {
  expect(userAgent("1.1.0")).toBe(`MuW/1.1.0 (${CONTACT})`);
  // The same address as «Contact» in the privacy policy.
  const contact = EN.privacy.sections[EN.privacy.sections.length - 1];
  expect(contact.heading).toBe("Contact");
  expect(JSON.stringify(contact.blocks)).toContain(CONTACT);
});

test("a product is asked for by its code alone", () => {
  expect(productUrl("3017620422003")).toBe(
    "https://world.openfoodfacts.org/api/v2/product/3017620422003.json?fields=code,product_name,brands,nutriments",
  );
});

test("a product found is its name and what 100 g hold, in kilocalories", () => {
  expect(productFrom(NUTELLA, "3017620422003")).toEqual({
    kind: "found",
    product: {
      barcode: "3017620422003",
      name: "Nutella",
      kcalPer100g: 539,
      proteinPer100g: 6.3,
      carbsPer100g: 57.5,
      fatPer100g: 30.9,
    },
  });
});

test("the kilojoules are never taken for kilocalories", () => {
  const onlyKj = {
    ...NUTELLA,
    product: {
      ...NUTELLA.product,
      nutriments: { energy_100g: 2252, "energy-kj_100g": 2252 },
    },
  };
  expect(productFrom(onlyKj, "3017620422003")).toEqual({ kind: "no_calories" });
});

test("a product without a name takes its first brand, else its code", () => {
  const branded = { ...NUTELLA, product: { ...NUTELLA.product, product_name: " " } };
  expect(productFrom(branded, "3017620422003")).toMatchObject({
    product: { name: "Ferrero" },
  });
  const bare = {
    ...NUTELLA,
    product: { nutriments: NUTELLA.product.nutriments },
  };
  expect(productFrom(bare, "3017620422003")).toMatchObject({
    product: { name: "3017620422003" },
  });
});

test("a name longer than a food's is cut, and a nutrient that does not read is unknown", () => {
  const long = {
    ...NUTELLA,
    product: {
      product_name: "A".repeat(80),
      nutriments: { "energy-kcal_100g": 100, proteins_100g: "6", fat_100g: 130 },
    },
  };
  expect(productFrom(long, "3017620422003")).toEqual({
    kind: "found",
    product: {
      barcode: "3017620422003",
      name: "A".repeat(60),
      kcalPer100g: 100,
      proteinPer100g: null,
      carbsPer100g: null,
      fatPer100g: null,
    },
  });
});

test("calories no food can hold are not a number to keep", () => {
  for (const kcal of [-1, 901, "539", null, Number.NaN]) {
    const odd = {
      ...NUTELLA,
      product: { ...NUTELLA.product, nutriments: { "energy-kcal_100g": kcal } },
    };
    expect(productFrom(odd, "3017620422003")).toEqual({ kind: "no_calories" });
  }
});

test("a code they do not have is not found; an answer that does not read failed", () => {
  expect(
    productFrom({ code: "00000000", status: 0, status_verbose: "no code" }, "0"),
  ).toEqual({ kind: "not_found" });
  expect(productFrom(null, "0")).toEqual({ kind: "failed" });
  expect(productFrom("<html>", "0")).toEqual({ kind: "failed" });
  expect(productFrom({ status: 1 }, "0")).toEqual({ kind: "failed" });
  expect(productFrom({ status: "success", product: {} }, "0")).toEqual({
    kind: "failed",
  });
});

test("the request carries the code and who asks, and nothing of the user", async () => {
  const fetchFn = answering(NUTELLA);
  const answer = await lookUpProduct(" 3017 6204 22003 ", {
    fetchFn,
    version: "1.1.0",
  });
  expect(answer.kind).toBe("found");
  expect(fetchFn).toHaveBeenCalledTimes(1);
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(productUrl("3017620422003"));
  expect(init?.method).toBe("GET");
  expect(init?.headers).toEqual({
    Accept: "application/json",
    "User-Agent": `MuW/1.1.0 (${CONTACT})`,
  });
  expect(init?.body).toBeUndefined();
});

test("a text that is not a barcode is never sent", async () => {
  const fetchFn = answering(NUTELLA);
  for (const text of ["", "pasta", "12345", "30176204220031234"]) {
    expect(await lookUpProduct(text, { fetchFn })).toEqual({ kind: "not_found" });
  }
  expect(fetchFn).not.toHaveBeenCalled();
});

test("404 is a product they do not have; another error, or no network, failed", async () => {
  expect(await lookUpProduct("3017620422003", { fetchFn: answering({}, 404) })).toEqual(
    { kind: "not_found" },
  );
  expect(await lookUpProduct("3017620422003", { fetchFn: answering({}, 503) })).toEqual(
    { kind: "failed" },
  );
  const down = jest.fn(async () => {
    throw new TypeError("Network request failed");
  }) as unknown as typeof fetch;
  expect(await lookUpProduct("3017620422003", { fetchFn: down })).toEqual({
    kind: "failed",
  });
});

test("an answer that does not come in time failed", async () => {
  const never = jest.fn(
    (_url: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
  ) as unknown as typeof fetch;
  expect(
    await lookUpProduct("3017620422003", { fetchFn: never, timeoutMs: 5 }),
  ).toEqual({ kind: "failed" });
});
