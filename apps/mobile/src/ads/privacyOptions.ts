/**
 * Google's «Privacy options» form (TASK-153): where the law asks for a
 * consent to ads (EEA, UK, Switzerland), the user must be able to change it
 * later from inside the app. Google's consent SDK (UMP) says where, and
 * shows its own form. Nothing here may hold the app back: without the SDK,
 * the network or the requirement, there is simply no entry.
 */

/** What the screens need from Google's consent SDK. */
export type PrivacyOptions = {
  /** True where Google says the user must be able to change their choice.
   * Never rejects. */
  required(): Promise<boolean>;
  /** Shows Google's form; resolves when it is closed or could not open.
   * Never rejects. */
  open(): Promise<void>;
};

/** Expo Go, the web, tests: no ad network, so nothing to change. */
export const NO_PRIVACY_OPTIONS: PrivacyOptions = {
  required: () => Promise.resolve(false),
  open: () => Promise.resolve(),
};

/** The part of Google's `AdsConsent` used here: tests stand in for it. */
export type ConsentSdk = {
  requestInfoUpdate(): Promise<unknown>;
  getConsentInfo(): Promise<{ privacyOptionsRequirementStatus: string }>;
  showPrivacyOptionsForm(): Promise<unknown>;
};

/** `AdsConsentPrivacyOptionsRequirementStatus.REQUIRED`. */
const REQUIRED = "REQUIRED";

export function createPrivacyOptions(consent: ConsentSdk): PrivacyOptions {
  return {
    async required() {
      try {
        // The status is UNKNOWN until Google has been asked once.
        await consent.requestInfoUpdate();
        const info = await consent.getConsentInfo();
        return info.privacyOptionsRequirementStatus === REQUIRED;
      } catch {
        return false;
      }
    },
    async open() {
      try {
        await consent.showPrivacyOptionsForm();
      } catch {
        // The form could not open (no network): the choice stays as it was.
      }
    },
  };
}
