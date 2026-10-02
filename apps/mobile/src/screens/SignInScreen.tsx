import { type Ref, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import type { SignInFields, SignUpFields } from "../account/fields";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Segmented } from "./Segmented";

export type SignInMode = "signUp" | "logIn";

const MODES = [
  { value: "signUp", label: "Sign up" },
  { value: "logIn", label: "Log in" },
] as const;

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
};

/**
 * «Sign up» and «Log in» (TASK-115): email and password, and for a new
 * account a username and «I am at least 16» (ADR-0114). The fields are
 * checked before they leave; what goes wrong is said under the button.
 */
export function SignInScreen({
  initialMode,
  busy,
  problem,
  notice,
  onSignUp,
  onLogIn,
  onMode,
}: Props) {
  const [mode, setMode] = useState<SignInMode>(initialMode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [atLeast16, setAtLeast16] = useState(false);
  const usernameField = useRef<TextInput>(null);
  const passwordField = useRef<TextInput>(null);
  const signingUp = mode === "signUp";

  function submit() {
    if (busy) {
      return;
    }
    if (signingUp) {
      onSignUp({ email, username, password, atLeast16 });
    } else {
      onLogIn({ email, password });
    }
  }

  return (
    <View style={styles.form}>
      {notice && (
        <Text style={[styles.notice, notice.tone === "warning" && styles.warning]}>
          {notice.text}
        </Text>
      )}
      <Segmented
        options={MODES}
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
        label="EMAIL"
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType={signingUp ? "emailAddress" : "username"}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() =>
          (signingUp ? usernameField : passwordField).current?.focus()
        }
      />
      {signingUp && (
        <Field
          ref={usernameField}
          label="USERNAME"
          value={username}
          onChangeText={setUsername}
          placeholder="3 to 20 letters, digits, _ or ."
          autoComplete="username-new"
          textContentType="nickname"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordField.current?.focus()}
        />
      )}
      <Field
        ref={passwordField}
        label="PASSWORD"
        value={password}
        onChangeText={setPassword}
        placeholder={signingUp ? "At least 8 characters" : undefined}
        secureTextEntry
        autoComplete={signingUp ? "new-password" : "current-password"}
        textContentType={signingUp ? "newPassword" : "password"}
        returnKeyType={signingUp ? "next" : "go"}
        onSubmitEditing={signingUp ? undefined : submit}
      />
      {signingUp && (
        <Pressable
          style={styles.check}
          onPress={() => setAtLeast16(!atLeast16)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: atLeast16 }}
          // The tick is drawn, not read: the label says what it is.
          accessibilityLabel="I am at least 16"
        >
          <View style={[styles.box, atLeast16 && styles.boxChecked]}>
            {atLeast16 && <Text style={styles.tick}>✓</Text>}
          </View>
          <Text style={styles.checkText}>I am at least 16</Text>
        </Pressable>
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
            ? busy
              ? "Signing up…"
              : "Sign up"
            : busy
              ? "Logging in…"
              : "Log in"}
        </Text>
      </Pressable>
      {problem && <Text style={styles.problem}>{problem}</Text>}
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  ref?: Ref<TextInput>;
};

/** A labelled field, dark like the rest of the app. */
function Field({ label, ref, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={styles.input}
        placeholderTextColor={color.textFaint}
        keyboardAppearance="dark"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label.toLowerCase()}
        {...input}
      />
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
  // Not yellow: that is the route's (docs/UI.md, «Il tema»).
  button: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  buttonBusy: {
    opacity: 0.6,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
});
