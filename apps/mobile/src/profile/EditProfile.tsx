import { BIO_MAX_LENGTH, type User } from "@shaperoute/shared-types";
import { type Ref, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import type { Account } from "../account/useAccount";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { bioLength, bioOf, checkProfile } from "./profileFields";

type Props = {
  user: User;
  account: Pick<Account, "editProfile">;
  /** Saved, or nothing to save: back to «Profile», which shows it. */
  onDone: () => void;
};

/**
 * «Edit profile» (TASK-116, ADR-0128): the username and the bio, checked
 * with the API's rules before they leave. What goes wrong is said under
 * «Save», and the fields keep what was written; «←» leaves without saving.
 */
export function EditProfile({ user, account, onDone }: Props) {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(bioOf(user));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // A second tap while the first is on its way sends nothing.
  const savingNow = useRef(false);
  const bioField = useRef<TextInput>(null);
  const length = bioLength(bio.trim());
  const over = length > BIO_MAX_LENGTH;

  async function save() {
    if (savingNow.current) {
      return;
    }
    const checked = checkProfile({ username, bio }, user);
    if (!checked.ok) {
      setProblem(checked.problem);
      return;
    }
    if (checked.request === null) {
      onDone();
      return;
    }
    savingNow.current = true;
    setSaving(true);
    setProblem(null);
    const failed = await account.editProfile(checked.request);
    savingNow.current = false;
    setSaving(false);
    if (failed === null) {
      onDone();
    } else {
      setProblem(failed);
    }
  }

  return (
    <View style={styles.form}>
      <Field
        label="USERNAME"
        value={username}
        onChangeText={setUsername}
        placeholder="3 to 20 letters, digits, _ or ."
        autoComplete="username-new"
        textContentType="nickname"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => bioField.current?.focus()}
      />
      <View style={styles.field}>
        <Field
          ref={bioField}
          label="BIO"
          value={bio}
          onChangeText={setBio}
          placeholder="A few words about you"
          multiline
          autoCapitalize="sentences"
          autoCorrect
          style={[styles.input, styles.bio]}
        />
        <Text
          style={[styles.count, over && styles.countOver]}
          accessibilityLabel={`${length} of ${BIO_MAX_LENGTH} characters`}
        >
          {`${length}/${BIO_MAX_LENGTH}`}
        </Text>
      </View>
      <Pressable
        style={[styles.button, saving && styles.busy]}
        onPress={() => void save()}
        disabled={saving}
        accessibilityRole="button"
        accessibilityState={{ disabled: saving, busy: saving }}
      >
        <Text style={styles.buttonText}>{saving ? "Saving…" : "Save"}</Text>
      </Pressable>
      {problem !== null && <Text style={styles.problem}>{problem}</Text>}
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  ref?: Ref<TextInput>;
};

/** A labelled field, as in «Sign up» (SignInScreen.tsx). */
function Field({ label, ref, style, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={style ?? styles.input}
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
  // Room for the two or three lines a bio takes.
  bio: {
    minHeight: 3 * MIN_TAP_SIZE,
    textAlignVertical: "top",
  },
  count: {
    alignSelf: "flex-end",
    color: color.textFaint,
    fontSize: fontSize.small,
  },
  countOver: {
    color: color.error,
  },
  // Neutral: the yellow belongs to the route (docs/UI.md, «Il tema»).
  button: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  busy: {
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
