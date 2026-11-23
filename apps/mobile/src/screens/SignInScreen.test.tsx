import { fireEvent, render, screen } from "@testing-library/react-native";

import { PASSWORD_RULES, SignInScreen, type SignInMode } from "./SignInScreen";

function show({
  initialMode = "signUp",
  busy = false,
  problem = null,
  notice = null,
}: {
  initialMode?: SignInMode;
  busy?: boolean;
  problem?: string | null;
  notice?: { text: string; tone: "warning" | "muted" } | null;
} = {}) {
  const onSignUp = jest.fn();
  const onLogIn = jest.fn();
  const onMode = jest.fn();
  const shown = render(
    <SignInScreen
      initialMode={initialMode}
      busy={busy}
      problem={problem}
      notice={notice}
      onSignUp={onSignUp}
      onLogIn={onLogIn}
      onMode={onMode}
    />,
  );
  return { shown, onSignUp, onLogIn, onMode };
}

/** The button at the foot of the form, not the tab of the same name. */
function submit() {
  return screen.getByTestId("account-submit");
}

test("signing up sends what was typed, with the box ticked", async () => {
  const { shown, onSignUp } = show();
  await shown;
  await fireEvent.changeText(screen.getByLabelText("email"), "runner@example.com");
  await fireEvent.changeText(screen.getByLabelText("username"), "Runner_42");
  await fireEvent.changeText(
    screen.getByLabelText("password"),
    "correct horse battery",
  );
  const box = screen.getByRole("checkbox", {
    name: "I am at least 16",
    checked: false,
  });
  await fireEvent.press(box);
  expect(
    screen.getByRole("checkbox", { name: "I am at least 16", checked: true }),
  ).toBe(box);
  await fireEvent.press(submit());
  expect(onSignUp).toHaveBeenCalledWith({
    email: "runner@example.com",
    username: "Runner_42",
    password: "correct horse battery",
    atLeast16: true,
    noAwayEmail: false,
  });
});

test("the email when away is said, and its box starts unticked (TASK-284)", async () => {
  const { shown, onSignUp } = show();
  await shown;
  expect(
    screen.getByText(
      "If you don't open MuW for 2 weeks, we email you once with what's new.",
    ),
  ).toBeOnTheScreen();
  const box = screen.getByRole("checkbox", {
    name: "Don't send me these emails",
    checked: false,
  });
  await fireEvent.press(box);
  await fireEvent.press(submit());
  expect(onSignUp).toHaveBeenCalledWith(expect.objectContaining({ noAwayEmail: true }));
});

test("the box unticked is sent as it is: the account says why not", async () => {
  const { shown, onSignUp } = show();
  await shown;
  await fireEvent.press(submit());
  expect(onSignUp).toHaveBeenCalledWith({
    email: "",
    username: "",
    password: "",
    atLeast16: false,
    noAwayEmail: false,
  });
});

test("«Log in» asks only for email and password", async () => {
  const { shown, onLogIn, onMode, onSignUp } = show();
  await shown;
  await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
  expect(onMode).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText("username")).toBeNull();
  expect(screen.queryByRole("checkbox")).toBeNull();
  await fireEvent.changeText(screen.getByLabelText("email"), "runner@example.com");
  await fireEvent.changeText(screen.getByLabelText("password"), "secret password");
  await fireEvent(screen.getByLabelText("password"), "submitEditing");
  expect(onLogIn).toHaveBeenCalledWith({
    email: "runner@example.com",
    password: "secret password",
  });
  await fireEvent.press(submit());
  expect(onLogIn).toHaveBeenCalledTimes(2);
  expect(onSignUp).not.toHaveBeenCalled();
});

test("the chosen form again is not a change", async () => {
  const { shown, onMode } = show({ initialMode: "logIn" });
  await shown;
  expect(screen.getByRole("button", { name: "Log in", selected: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Log in", selected: true }));
  expect(onMode).not.toHaveBeenCalled();
});

test("while waiting the button says so and sends nothing", async () => {
  const { shown, onSignUp } = show({ busy: true });
  await shown;
  expect(screen.getByText("Signing up…")).toBeTruthy();
  await fireEvent.press(submit());
  expect(onSignUp).not.toHaveBeenCalled();
});

test("the problem and the notice are on the screen", async () => {
  const { shown } = show({
    initialMode: "logIn",
    problem: "Wrong email or password.",
    notice: { text: "Your session has ended. Log in again.", tone: "warning" },
  });
  await shown;
  expect(screen.getByText("Wrong email or password.")).toBeTruthy();
  expect(screen.getByText("Your session has ended. Log in again.")).toBeTruthy();
});

test("the eye shows the password and hides it again, the text kept (TASK-458)", async () => {
  const { shown, onLogIn } = show({ initialMode: "logIn" });
  await shown;
  const password = screen.getByLabelText("password");
  await fireEvent.changeText(password, "secret password");
  expect(password.props.secureTextEntry).toBe(true);
  expect(screen.queryByRole("button", { name: "Hide password" })).toBeNull();

  await fireEvent.press(screen.getByRole("button", { name: "Show password" }));
  expect(screen.getByLabelText("password").props.secureTextEntry).toBe(false);
  expect(screen.getByLabelText("password").props.value).toBe("secret password");
  expect(screen.queryByRole("button", { name: "Show password" })).toBeNull();

  await fireEvent.press(screen.getByRole("button", { name: "Hide password" }));
  expect(screen.getByLabelText("password").props.secureTextEntry).toBe(true);
  await fireEvent.press(submit());
  expect(onLogIn).toHaveBeenCalledWith({ email: "", password: "secret password" });
});

test("the eye is on «Sign up» too, and only on the password", async () => {
  const { shown } = show();
  await shown;
  expect(screen.getAllByRole("button", { name: "Show password" })).toHaveLength(1);
  expect(screen.getByLabelText("email").props.secureTextEntry).toBeUndefined();
  expect(screen.getByLabelText("username").props.secureTextEntry).toBeUndefined();
});

test("«Sign up» tells iOS which field names the account and what a password is", async () => {
  const { shown } = show();
  await shown;
  // The email, not the username of the profile, goes with the password.
  expect(screen.getByLabelText("email").props.textContentType).toBe("username");
  expect(screen.getByLabelText("username").props.textContentType).toBe("none");
  const password = screen.getByLabelText("password");
  expect(password.props.textContentType).toBe("newPassword");
  expect(password.props.autoComplete).toBe("new-password");
  // The strong password iOS offers is one the account takes.
  expect(PASSWORD_RULES).toBe("minlength: 8; maxlength: 128;");
  expect(password.props.passwordRules).toBe(PASSWORD_RULES);
});

test("«Log in» asks iOS for the saved password, with no rules", async () => {
  const { shown } = show({ initialMode: "logIn" });
  await shown;
  expect(screen.getByLabelText("email").props.textContentType).toBe("username");
  const password = screen.getByLabelText("password");
  expect(password.props.textContentType).toBe("password");
  expect(password.props.autoComplete).toBe("current-password");
  expect(password.props.passwordRules).toBeUndefined();
});
