import { type ReactNode, type Ref, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { PASSWORD_LENGTH } from "@shaperoute/shared-types";

import type { AccountEmail } from "../account/accountEmail";
import type { SignInFields, SignUpFields } from "../account/fields";
import { t, tLater } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { ForgotPassword } from "./ForgotPassword";
import { Segmented } from "./Segmented";

export type SignInMode = "signUp" | "logIn";

/** In English: shown with `t()` (TASK-210). */
const MODES = [
  { value: "signUp", label: tLater("Sign up") },
  { value: "logIn", label: tLater("Log in") },
] as const;

/**
 * What a password of the account is, in the words iOS reads before it
 * offers a strong one (`UITextInputPasswordRules`): the lengths the server
 * takes.
 */
export const PASSWORD_RULES = `minlength: ${PASSWORD_LENGTH.min}; maxlength: ${PASSWORD_LENGTH.max};`;

/**
 * What the box of the password remembers after the eye hid it again. iOS
 * empties a box that turns secret at its next key (seen in the simulator,
 * TASK-458): it says the box is empty, and then, for a letter, says the
 * letter alone. What was written is kept here to be put back.
 */
export type EyeMemory = {
  /** The text when the eye hid it again, until the next key. */
  held: string | null;
  /** The text iOS has just emptied, and when: its letter may follow. */
  emptied: { text: string; at: number } | null;
};

export const NO_MEMORY: EyeMemory = { held: null, emptied: null };

/** The letter iOS types after it emptied the box comes at once. */
const LETTER_FOLLOWS_MS = 100;

/**
 * The password after a key, and what is remembered for the next. An empty
 * box right after the eye is a delete, of one letter and not of all, unless
 * a letter follows it at once: then nothing was deleted, and the letter
 * goes after what was written. More than one letter at once (a paste, the
 * password iOS fills) is taken as it is.
 */
export function afterKey(
  memory: EyeMemory,
  next: string,
  now: number,
): { password: string; memory: EyeMemory } {
  const { held, emptied } = memory;
  if (emptied !== null && next.length === 1 && now - emptied.at <= LETTER_FOLLOWS_MS) {
    return { password: emptied.text + next, memory: NO_MEMORY };
  }
  if (held !== null && held.length > 1) {
    if (next === "") {
      return {
        password: held.slice(0, -1),
        memory: { held: null, emptied: { text: held, at: now } },
      };
    }
    if (next.length === 1) {
      return { password: held + next, memory: NO_MEMORY };
    }
  }
  return { password: next, memory: NO_MEMORY };
}

/** The eye in the password's box: its square, lid, line and pupil. */
const EYE_SIDE = 24;
const EYE_LID = 15;
const EYE_STROKE = 2;
const EYE_PUPIL = 6;

type Props = {
  /** The form shown first: "Log in" after a session ended. */
  initialMode: SignInMode;
  /** The request on its way, if any: the button waits. */
  busy: boolean;
  /** Why the last try failed, in words. */
  problem: string | null;
  /** Why the phone is signed out, when there is something to say. */
  notice: { text: string; tone: "warning" | "muted" } | null;
  onSignUp: (fields: SignUpFields) => void;
  onLogIn: (fields: SignInFields) => void;
  /** Another form: the last problem was the other one's. */
  onMode: () => void;
  /**
   * «Forgot password?» under «Log in» (TASK-300): the server is asked
   * whether it sends the email the first time «Log in» shows, and the link
   * is there only if it does.
   */
  email?: AccountEmail;
};

/**
 * «Sign up» and «Log in» (TASK-115): email and password, and for a new
 * account a username and «I am at least 16» (ADR-0114). The fields are
 * checked before they leave; what goes wrong is said under the button.
 * Under the boxes, what the email when away is, and the unticked box that
 * says no to it (TASK-284, ADR-0244).
 *
 * What iOS is told about the fields (TASK-458): the email is the account's
 * name in both forms, so the Keychain keeps it with the password and not
 * the username of the profile; the new password comes with the rules of
 * the account, so the strong password iOS offers is one the server takes.
 * The eye in the password's box shows what is being typed, and hides it
 * again: the text stays as it is.
 */
export function SignInScreen({
  initialMode,
  busy,
  problem,
  notice,
  onSignUp,
  onLogIn,
  onMode,
  email: emails,
}: Props) {
  const [mode, setMode] = useState<SignInMode>(initialMode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Hidden until the eye is touched (TASK-458).
  const [passwordShown, setPasswordShown] = useState(false);
  // What the eye remembers from the touch that hides the password again.
  const eye = useRef<EyeMemory>(NO_MEMORY);
  const [atLeast16, setAtLeast16] = useState(false);
  const [noAwayEmail, setNoAwayEmail] = useState(false);
  const usernameField = useRef<TextInput>(null);
  const passwordField = useRef<TextInput>(null);
  const signingUp = mode === "signUp";
  const [forgot, setForgot] = useState(false);
  const check = emails?.check;
  useEffect(() => {
    if (!signingUp) {
      check?.();
    }
  }, [signingUp, check]);
  const askReset = emails?.on ? emails.askReset : undefined;

  function submit() {
    if (busy) {
      return;
    }
    if (signingUp) {
      onSignUp({ email, username, password, atLeast16, noAwayEmail });
    } else {
      onLogIn({ email, password });
    }
  }

  if (forgot && askReset !== undefined) {
    return (
      <ForgotPassword
        email={email}
        askReset={askReset}
        onBack={() => setForgot(false)}
      />
    );
  }

  return (
    <View style={styles.form}>
      {notice && (
        <Text style={[styles.notice, notice.tone === "warning" && styles.warning]}>
          {notice.text}
        </Text>
      )}
      <Segmented
        options={MODES.map((each) => ({ value: each.value, label: t(each.label) }))}
        value={mode}
        onChange={(next) => {
          if (next !== mode) {
            setMode(next);
            onMode();
          }
        }}
        style={styles.modes}
      />
      <Field
        label={t("EMAIL")}
        value={email}
        onChangeText={setEmail}
        placeholder={t("name@example.com")}
        keyboardType="email-address"
        autoComplete="email"
        // The name of the account for iOS, in both forms: it is what
        // «Log in» asks for later.
        textContentType="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() =>
          (signingUp ? usernameField : passwordField).current?.focus()
        }
      />
      {signingUp && (
        <Field
          ref={usernameField}
          label={t("USERNAME")}
          value={username}
          onChangeText={setUsername}
          placeholder={t("3 to 20 letters, digits, _ or .")}
          autoComplete="username-new"
          // Not the name of the account: iOS keeps the email with the
          // password.
          textContentType="none"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordField.current?.focus()}
        />
      )}
      <Field
        ref={passwordField}
        label={t("PASSWORD")}
        value={password}
        onChangeText={(next) => {
          const after = afterKey(eye.current, next, Date.now());
          eye.current = after.memory;
          setPassword(after.password);
        }}
        placeholder={signingUp ? t("At least 8 characters") : undefined}
        secureTextEntry={!passwordShown}
        autoComplete={signingUp ? "new-password" : "current-password"}
        textContentType={signingUp ? "newPassword" : "password"}
        passwordRules={signingUp ? PASSWORD_RULES : undefined}
        returnKeyType={signingUp ? "next" : "go"}
        onSubmitEditing={signingUp ? undefined : submit}
        end={
          <Pressable
            style={({ pressed }) => [styles.eyeButton, pressed && styles.eyePressed]}
            onPress={() => {
              eye.current =
                passwordShown && Platform.OS === "ios"
                  ? { held: password, emptied: null }
                  : NO_MEMORY;
              setPasswordShown(!passwordShown);
            }}
            accessibilityRole="button"
            accessibilityLabel={passwordShown ? t("Hide password") : t("Show password")}
            hitSlop={space.xs}
          >
            <EyeGlyph crossed={passwordShown} />
          </Pressable>
        }
      />
      {signingUp && (
        <Pressable
          style={styles.check}
          onPress={() => setAtLeast16(!atLeast16)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: atLeast16 }}
          // The tick is drawn, not read: the label says what it is.
          accessibilityLabel={t("I am at least 16")}
        >
          <View style={[styles.box, atLeast16 && styles.boxChecked]}>
            {atLeast16 && <Text style={styles.tick}>✓</Text>}
          </View>
          <Text style={styles.checkText}>{t("I am at least 16")}</Text>
        </Pressable>
      )}
      {signingUp && (
        <View style={styles.away}>
          <Text style={styles.awayText}>
            {t("If you don't open MuW for 2 weeks, we email you once with what's new.")}
          </Text>
          <Pressable
            style={styles.check}
            onPress={() => setNoAwayEmail(!noAwayEmail)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: noAwayEmail }}
            accessibilityLabel={t("Don't send me these emails")}
          >
            <View style={[styles.box, noAwayEmail && styles.boxChecked]}>
              {noAwayEmail && <Text style={styles.tick}>✓</Text>}
            </View>
            <Text style={styles.checkText}>{t("Don't send me these emails")}</Text>
          </Pressable>
        </View>
      )}
      <Pressable
        style={[styles.button, busy && styles.buttonBusy]}
        onPress={submit}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy, busy }}
        testID="account-submit"
      >
        <Text style={styles.buttonText}>
          {signingUp
            ? t(busy ? "Signing up…" : "Sign up")
            : t(busy ? "Logging in…" : "Log in")}
        </Text>
      </Pressable>
      {problem && <Text style={styles.problem}>{problem}</Text>}
      {!signingUp && askReset !== undefined && (
        <Pressable
          style={({ pressed }) => [styles.forgot, pressed && styles.forgotPressed]}
          onPress={() => {
            setForgot(true);
            onMode();
          }}
          accessibilityRole="button"
        >
          <Text style={styles.forgotText}>{t("Forgot password?")}</Text>
        </Pressable>
      )}
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  ref?: Ref<TextInput>;
  /** A control inside the box, at its end: the eye of the password. */
  end?: ReactNode;
};

/** A labelled field, dark like the rest of the app. */
function Field({ label, ref, end, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          ref={ref}
          style={[styles.input, end !== undefined && styles.inputWithEnd]}
          placeholderTextColor={color.textFaint}
          keyboardAppearance="dark"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label.toLowerCase()}
          {...input}
        />
        {end}
      </View>
    </View>
  );
}

/**
 * An eye, drawn (the app has no icons): a lid with its two corners and the
 * pupil; crossed while the password is shown, when a touch hides it again.
 * Hidden from the screen reader: the button around it says what it does.
 */
function EyeGlyph({ crossed }: { crossed: boolean }) {
  return (
    <View
      style={styles.eye}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.eyeLid} />
      <View style={styles.eyePupil} />
      {crossed && <View style={styles.eyeGap} />}
      {crossed && <View style={styles.eyeBar} />}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: space.lg,
  },
  notice: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  warning: {
    color: color.warning,
  },
  // On the screen's background the track needs a surface to show.
  modes: {
    backgroundColor: color.surface,
  },
  field: {
    gap: space.xs,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
  input: {
    minHeight: MIN_TAP_SIZE,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: fontSize.input,
    color: color.text,
    backgroundColor: color.surface,
  },
  // Room for the eye: the text never runs under it.
  inputWithEnd: {
    paddingRight: MIN_TAP_SIZE,
  },
  eyeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  eyePressed: {
    opacity: 0.6,
  },
  eye: {
    width: EYE_SIDE,
    height: EYE_SIDE,
    alignItems: "center",
    justifyContent: "center",
  },
  // A square on its corner, two corners round and two sharp, pressed flat.
  eyeLid: {
    position: "absolute",
    width: EYE_LID,
    height: EYE_LID,
    borderWidth: EYE_STROKE,
    borderColor: color.textMuted,
    borderTopLeftRadius: EYE_LID,
    borderBottomRightRadius: EYE_LID,
    borderTopRightRadius: EYE_STROKE,
    borderBottomLeftRadius: EYE_STROKE,
    transform: [{ scaleY: 0.7 }, { rotate: "45deg" }],
  },
  eyePupil: {
    width: EYE_PUPIL,
    height: EYE_PUPIL,
    borderRadius: EYE_PUPIL / 2,
    backgroundColor: color.textMuted,
  },
  // The field's colour under the bar, so the bar reads over the lid.
  eyeGap: {
    position: "absolute",
    width: EYE_SIDE,
    height: EYE_STROKE * 2,
    backgroundColor: color.surface,
    transform: [{ rotate: "-45deg" }],
  },
  eyeBar: {
    position: "absolute",
    width: EYE_SIDE,
    height: EYE_STROKE,
    borderRadius: EYE_STROKE / 2,
    backgroundColor: color.textMuted,
    transform: [{ rotate: "-45deg" }],
  },
  check: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    alignSelf: "flex-start",
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm / 2,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.text,
  },
  tick: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  checkText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  away: {
    gap: space.xs,
  },
  awayText: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  // Not yellow: that is the route's (docs/UI.md, «Il tema»).
  // Yellow with dark words, as «Draw route»: the page's one command, and
  // grey it read as a secondary one (TASK-508, ADR-0409; the user's choice
  // of 2026-11-24, an exception to «yellow is the route's» as ADR-0183).
  button: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.accent,
  },
  buttonBusy: {
    opacity: 0.6,
  },
  buttonText: {
    color: color.onAccent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
  forgot: {
    minHeight: MIN_TAP_SIZE,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  forgotPressed: {
    opacity: 0.6,
  },
  forgotText: {
    color: color.textMuted,
    fontSize: fontSize.body,
    textDecorationLine: "underline",
  },
});
