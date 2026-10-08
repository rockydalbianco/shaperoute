import { Component, Fragment, type ReactNode } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/** The logo across most of a phone, never huge on a tablet, as after «Save». */
const LOGO_SHARE = 0.7;
const LOGO_WIDEST = 300;
/** The logo's image is a square with the logo across its middle
 * (`assets/splash-logo-dark.png`): it shows through a low window. */
const LOGO_WINDOW = 0.26;

type Props = {
  children: ReactNode;
};

type State = {
  /** What a component threw while drawing, until «Try again». */
  error: Error | null;
  /** How many times the app was started again: a new key mounts it anew. */
  attempt: number;
};

/**
 * Around the app (TASK-256, ADR-0220): a component that throws while it
 * draws no longer leaves the screen white. In its place the yellow of the
 * launch with the logo, «Something went wrong.» and «Try again», which
 * mounts the app anew; a run in progress is in its file and comes back by
 * itself. In a development build the error is written too.
 */
export class AppBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  tryAgain = () => {
    this.setState((now) => ({ error: null, attempt: now.attempt + 1 }));
  };

  render() {
    if (this.state.error) {
      return <BrokenScreen error={this.state.error} onTryAgain={this.tryAgain} />;
    }
    return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
  }
}

/** The error of a development build, in a line; nothing on a phone. */
export function errorDetail(error: Error, dev: boolean = __DEV__): string | null {
  if (!dev) {
    return null;
  }
  const words = error.message.trim();
  return words === "" ? error.name : `${error.name}: ${words}`;
}

/** What is seen instead of the app: the launch's yellow, the logo, the
 * words and the way back. */
export function BrokenScreen({
  error,
  onTryAgain,
}: {
  error: Error;
  onTryAgain: () => void;
}) {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * LOGO_SHARE, LOGO_WIDEST);
  const detail = errorDetail(error);
  return (
    <View style={styles.cover} testID="app-broken">
      <View
        style={[
          styles.logoWindow,
          { width: logoWidth, height: logoWidth * LOGO_WINDOW },
        ]}
      >
        <Image
          source={require("../../assets/splash-logo-dark.png")}
          style={{ width: logoWidth, height: logoWidth }}
          accessible={false}
        />
      </View>
      <Text style={styles.words} accessibilityRole="alert">
        {t("Something went wrong.")}
      </Text>
      <Pressable style={styles.button} onPress={onTryAgain} accessibilityRole="button">
        <Text style={styles.buttonText}>{t("Try again")}</Text>
      </Pressable>
      {detail !== null && <Text style={styles.detail}>{detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    gap: space.xl,
    // The yellow of the launch (TASK-181): the app's own face, not a crash.
    backgroundColor: color.accent,
  },
  logoWindow: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  words: {
    color: color.onAccent,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    backgroundColor: color.onAccent,
  },
  buttonText: {
    color: color.accent,
    fontWeight: fontWeight.bold,
  },
  detail: {
    color: color.onAccent,
    fontSize: fontSize.detail,
    textAlign: "center",
  },
});
