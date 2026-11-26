import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

import { color } from "../theme/tokens";
import { SignInScreen } from "./SignInScreen";

// «Log in» and «Sign up» in yellow with dark words (TASK-508, ADR-0409):
// grey, the page's one command read as a secondary one. The user's choice
// of 2026-11-24, an exception to «yellow is the route's» as ADR-0183.

function form(initialMode: "signUp" | "logIn" = "signUp", busy = false) {
  return (
    <SignInScreen
      initialMode={initialMode}
      busy={busy}
      problem={null}
      notice={null}
      onSignUp={jest.fn()}
      onLogIn={jest.fn()}
      onMode={jest.fn()}
    />
  );
}

function submit() {
  return screen.getByTestId("account-submit");
}

function face() {
  return StyleSheet.flatten(submit().props.style) as ViewStyle;
}

function words(text: string) {
  return StyleSheet.flatten(screen.getByText(text).props.style) as TextStyle;
}

test("«Sign up» is yellow, its words dark", async () => {
  await render(form());
  expect(face().backgroundColor).toBe(color.accent);
  const inside = screen
    .getAllByText("Sign up")
    .map((each) => StyleSheet.flatten(each.props.style) as TextStyle)
    .filter((style) => style.color === color.onAccent);
  expect(inside).toHaveLength(1);
});

test("«Log in» too", async () => {
  await render(form("logIn"));
  expect(face().backgroundColor).toBe(color.accent);
  const inside = screen
    .getAllByText("Log in")
    .map((each) => StyleSheet.flatten(each.props.style) as TextStyle)
    .filter((style) => style.color === color.onAccent);
  expect(inside).toHaveLength(1);
});

test("while it sends it is the same yellow, dimmed, and cannot be pressed", async () => {
  await render(form("signUp", true));
  expect(face().backgroundColor).toBe(color.accent);
  expect(face().opacity).toBe(0.6);
  expect(submit()).toBeDisabled();
  expect(words("Signing up…").color).toBe(color.onAccent);
});

test("the two colours are the theme's, readable one on the other", () => {
  // «Sul giallo il testo è scuro» (docs/UI.md, «Il tema», rule 2).
  expect(color.accent).not.toBe(color.onAccent);
});
