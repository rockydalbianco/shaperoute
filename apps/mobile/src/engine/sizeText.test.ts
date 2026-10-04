import { act } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { sizeText } from "./sizeText";

jest.mock("expo-file-system", () => jest.requireActual("./memoryFiles"));

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("a size is in megabytes, from a gigabyte in gigabytes with one decimal", () => {
  expect(sizeText(0)).toBe("0 MB");
  expect(sizeText(400_000)).toBe("1 MB");
  expect(sizeText(19_400_000)).toBe("19 MB");
  expect(sizeText(999_400_000)).toBe("999 MB");
  expect(sizeText(999_600_000)).toBe("1.0 GB");
  expect(sizeText(1_230_000_000)).toBe("1.2 GB");
  expect(sizeText(2_000_000_000)).toBe("2.0 GB");
});

test("a size is written as the app's language writes it", async () => {
  await act(async () => saveLanguageChoice("it"));
  expect(sizeText(1_230_000_000)).toBe("1,2 GB");
  await act(async () => saveLanguageChoice("fr"));
  expect(sizeText(19_000_000)).toBe("19 Mo");
  expect(sizeText(1_230_000_000)).toBe("1,2 Go");
});
