/**
 * The name the API gives a run on Strava when none is typed (TASK-187,
 * strava.py `activity_name`): what was drawn and where, «Heart in Trento».
 * Shown as the hint of the name field of a saved run, which knows its place.
 */

type Drawn = {
  shape: string | null;
  word: string | null;
  title: string | null;
  place: string | null;
};

/** "Heart in Trento", "CIAO", "Christmas tree"; null for a run that drew
 * nothing known: Strava names it. */
export function automaticName(run: Drawn): string | null {
  const what = run.word || (run.shape && shapeName(run.shape)) || run.title || null;
  if (what === null) {
    return null;
  }
  return run.place ? `${what} in ${run.place}` : what;
}

/** "christmas_tree" → "Christmas tree", as Python's `capitalize`. */
function shapeName(shape: string): string {
  const words = shape.split("_").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}
