import Constants from "expo-constants";

import {
  barcodeOf,
  FOOD_NAME_MAX,
  foodName,
  GRAMS_PER_100G,
  KCAL_PER_100G,
} from "./foods";

/**
 * A packaged product looked up by its barcode on Open Food Facts (TASK-489
 * part G, ADR-0397, the user's choice «barcode as a part of its own»).
 *
 * - Only the barcode leaves the phone, straight to Open Food Facts: no
 *   account, no token, nothing of the diary. One request for one code a
 *   person read or typed, as they ask (15 reads a minute for each address).
 * - The request says who asks, as they ask of every app: name, version and
 *   the contact address MuW already publishes in its privacy policy.
 * - Their data is under the Open Database License: the product found is
 *   kept among the user's own foods with its code and «from Open Food
 *   Facts», apart from the USDA table, and «How we calculate» names them.
 * - MuW makes up no number: a product without its kilocalories for 100 g
 *   is not a food here, and the user writes it from the label.
 *
 * Read on 2026-11-23: GET /api/v2/product/<code>.json answers 200 with
 * `status` 1 and `product`, or `status` 0 without it for a code they do not
 * have; `product.nutriments["energy-kcal_100g"]`, `proteins_100g`,
 * `carbohydrates_100g` and `fat_100g` are numbers.
 */

export const OPEN_FOOD_FACTS = "https://world.openfoodfacts.org";
/** Where «How we calculate» and the licence point. */
export const OPEN_FOOD_FACTS_SITE = "https://openfoodfacts.org";

/** The contact MuW publishes (about/content, «Contact»). */
export const CONTACT = "muw2610@gmail.com";

const TIMEOUT_MS = 10_000;

/** «MuW/1.1.0 (contact)»: how the app names itself to Open Food Facts. */
export function userAgent(
  version: string = Constants.expoConfig?.version ?? "0",
): string {
  return `MuW/${version} (${CONTACT})`;
}

/** Where a product is read: its code and the fields a food needs. */
export function productUrl(barcode: string): string {
  return `${OPEN_FOOD_FACTS}/api/v2/product/${barcode}.json?fields=code,product_name,brands,nutriments`;
}

export type Product = {
  barcode: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
};

export type Lookup =
  | { kind: "found"; product: Product }
  /** Open Food Facts does not have this code. */
  | { kind: "not_found" }
  /** They have the product, not its kilocalories for 100 g. */
  | { kind: "no_calories" }
  /** No network, no answer in time, or an answer that does not read. */
  | { kind: "failed" };

function numberIn(value: unknown, range: { min: number; max: number }): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= range.min &&
    value <= range.max
    ? value
    : null;
}

/** A name a food can keep, cut to what a food holds; null for none. */
function nameOf(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return foodName(value.trim().replace(/\s+/g, " ").slice(0, FOOD_NAME_MAX));
}

/**
 * What an answer of Open Food Facts for `barcode` says. The name is the
 * product's, else its first brand, else the code itself: the user can
 * rewrite it.
 */
export function productFrom(body: unknown, barcode: string): Lookup {
  if (typeof body !== "object" || body === null) {
    return { kind: "failed" };
  }
  const answer = body as Record<string, unknown>;
  if (answer.status === 0) {
    return { kind: "not_found" };
  }
  if (
    answer.status !== 1 ||
    typeof answer.product !== "object" ||
    answer.product === null
  ) {
    return { kind: "failed" };
  }
  const product = answer.product as Record<string, unknown>;
  const nutriments =
    typeof product.nutriments === "object" && product.nutriments !== null
      ? (product.nutriments as Record<string, unknown>)
      : {};
  const kcal = numberIn(nutriments["energy-kcal_100g"], KCAL_PER_100G);
  if (kcal === null) {
    return { kind: "no_calories" };
  }
  const brand =
    typeof product.brands === "string" ? product.brands.split(",")[0] : null;
  return {
    kind: "found",
    product: {
      barcode,
      name: nameOf(product.product_name) ?? nameOf(brand) ?? barcode,
      kcalPer100g: kcal,
      proteinPer100g: numberIn(nutriments.proteins_100g, GRAMS_PER_100G),
      carbsPer100g: numberIn(nutriments.carbohydrates_100g, GRAMS_PER_100G),
      fatPer100g: numberIn(nutriments.fat_100g, GRAMS_PER_100G),
    },
  };
}

type Options = {
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
  version?: string;
  timeoutMs?: number;
};

/**
 * Asks Open Food Facts for the product with the barcode `code`. Never
 * throws: what went wrong is a kind of answer. A text that is not a
 * barcode is not asked for at all.
 */
export async function lookUpProduct(
  code: string,
  { fetchFn = fetch, version, timeoutMs = TIMEOUT_MS }: Options = {},
): Promise<Lookup> {
  const barcode = barcodeOf(code);
  if (barcode === null) {
    return { kind: "not_found" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(productUrl(barcode), {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": userAgent(version) },
      signal: controller.signal,
    });
    if (response.status === 404) {
      return { kind: "not_found" };
    }
    if (!response.ok) {
      return { kind: "failed" };
    }
    return productFrom(await response.json(), barcode);
  } catch {
    return { kind: "failed" };
  } finally {
    clearTimeout(timer);
  }
}
