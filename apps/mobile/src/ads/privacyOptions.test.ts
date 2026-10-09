import { act, renderHook } from "@testing-library/react-native";

import {
  type ConsentSdk,
  createPrivacyOptions,
  NO_PRIVACY_OPTIONS,
} from "./privacyOptions";
import { usePrivacyOptions } from "./usePrivacyOptions";

/** Google's consent SDK as the test wants it. */
function fakeConsent(
  status: string,
  { updateFails = false, formFails = false } = {},
): ConsentSdk & { updates: number; forms: number } {
  const consent = {
    updates: 0,
    forms: 0,
    requestInfoUpdate: () => {
      consent.updates += 1;
      return updateFails ? Promise.reject(new Error("offline")) : Promise.resolve();
    },
    getConsentInfo: () => Promise.resolve({ privacyOptionsRequirementStatus: status }),
    showPrivacyOptionsForm: () => {
      consent.forms += 1;
      return formFails ? Promise.reject(new Error("no form")) : Promise.resolve();
    },
  };
  return consent;
}

describe("createPrivacyOptions", () => {
  it("is required where Google says so, after asking Google first", async () => {
    const consent = fakeConsent("REQUIRED");
    await expect(createPrivacyOptions(consent).required()).resolves.toBe(true);
    expect(consent.updates).toBe(1);
  });

  it("is not required elsewhere, nor while the status is unknown", async () => {
    await expect(
      createPrivacyOptions(fakeConsent("NOT_REQUIRED")).required(),
    ).resolves.toBe(false);
    await expect(createPrivacyOptions(fakeConsent("UNKNOWN")).required()).resolves.toBe(
      false,
    );
  });

  it("is not required when Google cannot be reached", async () => {
    const options = createPrivacyOptions(
      fakeConsent("REQUIRED", { updateFails: true }),
    );
    await expect(options.required()).resolves.toBe(false);
  });

  it("opens Google's form, and never rejects when it cannot", async () => {
    const consent = fakeConsent("REQUIRED", { formFails: true });
    await expect(createPrivacyOptions(consent).open()).resolves.toBeUndefined();
    expect(consent.forms).toBe(1);
  });

  it("has nothing to show without an ad network (Expo Go)", async () => {
    await expect(NO_PRIVACY_OPTIONS.required()).resolves.toBe(false);
  });
});

describe("usePrivacyOptions", () => {
  it("shows the entry once Google says it is required, and opens the form", async () => {
    const consent = fakeConsent("REQUIRED");
    const options = createPrivacyOptions(consent);
    const get = () => options;
    const hook = await renderHook(() => usePrivacyOptions(get));
    await act(async () => {});
    expect(hook.result.current.shown).toBe(true);
    await act(async () => hook.result.current.open());
    expect(consent.forms).toBe(1);
  });

  it("keeps the entry hidden where it is not required", async () => {
    const options = createPrivacyOptions(fakeConsent("NOT_REQUIRED"));
    const get = () => options;
    const hook = await renderHook(() => usePrivacyOptions(get));
    await act(async () => {});
    expect(hook.result.current.shown).toBe(false);
  });

  it("is hidden where AdMob is not built in (Expo Go, tests)", async () => {
    const hook = await renderHook(() => usePrivacyOptions());
    await act(async () => {});
    expect(hook.result.current.shown).toBe(false);
  });
});
