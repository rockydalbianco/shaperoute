import { act, render, screen, within } from "@testing-library/react-native";

import { ActivitiesList } from "../activities/ActivitiesList";
import { FavoritesList } from "../favorites/FavoritesList";
import { saveLanguageChoice } from "../i18n/language";

// The empty pages of «Profile» (TASK-339 part C1, ADR-0293): the figure, a
// title and one line, as the Feed's; no button. Without «Profile» around
// them the doors have nothing, so the lists are empty.

afterEach(async () => {
  await act(async () => {
    saveLanguageChoice("phone");
  });
});

test("Favorites without favorites: a title and the line with the heart", async () => {
  await render(<FavoritesList margin={16} />);
  const empty = screen.getByTestId("favorites-empty");
  expect(within(empty).getByRole("header")).toHaveTextContent("No favorites yet");
  expect(
    within(empty).getByText("Tap ♡ on a route on the map to keep it here."),
  ).toBeOnTheScreen();
  expect(within(empty).queryByRole("button")).toBeNull();
});

test("My activities without activities: a title and the line for every sport", async () => {
  await render(<ActivitiesList />);
  const empty = screen.getByTestId("activities-empty");
  expect(within(empty).getByRole("header")).toHaveTextContent("No activities yet");
  expect(
    within(empty).getByText(
      "When you finish an activity and save it, you find it here.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/Save a run/)).toBeNull();
});

test("in Italian, the approved words", async () => {
  await act(async () => {
    saveLanguageChoice("it");
  });
  await render(<ActivitiesList />);
  expect(screen.getByRole("header")).toHaveTextContent("Ancora nessuna attività");
  expect(
    screen.getByText("Quando finisci un'attività e la salvi, la ritrovi qui."),
  ).toBeOnTheScreen();
  await render(<FavoritesList margin={16} />);
  expect(screen.getByRole("header")).toHaveTextContent("Ancora nessun preferito");
  expect(
    screen.getByText("Tocca ♡ su un percorso sulla mappa per tenerlo qui."),
  ).toBeOnTheScreen();
});
