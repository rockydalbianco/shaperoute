-- The monthly challenges: a theme on the contest, the drawings entered,
-- the reminder of the last days (TASK-343, ADR-0296, docs/CONCORSI.md
-- §15). A migration already in main is never edited: write the next one.

-- The theme, by language: {"en": {"title", "description"}, "it": …}, the
-- English always when there is one. NULL: the contest of ADR-0260, where
-- every post for everyone of the period takes part.
ALTER TABLE contests ADD COLUMN theme jsonb
    CHECK (theme IS NULL OR jsonb_typeof(theme -> 'en') = 'object');
-- When the push of the last days was sent (contest_clock.py): once.
ALTER TABLE contests ADD COLUMN reminded_at timestamptz;

-- The drawings entered in a contest with a theme, any number per account
-- (the user's choice of 2026-10-30). An entry says only that its owner
-- chose the theme: whether the drawing takes part is read as in a contest
-- without one (contests.py, PARTICIPATES_SQL). Gone with the contest, the
-- drawing or the account.
CREATE TABLE contest_entries (
    contest_id uuid NOT NULL REFERENCES contests (id) ON DELETE CASCADE,
    drawing_id uuid NOT NULL REFERENCES drawings (id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL,
    PRIMARY KEY (contest_id, drawing_id)
);

-- The entries of an account in a contest (`entered`, the push of the last
-- days), and the contests of a drawing (its deletion).
CREATE INDEX contest_entries_user_idx ON contest_entries (contest_id, user_id);
CREATE INDEX contest_entries_drawing_idx ON contest_entries (drawing_id);
