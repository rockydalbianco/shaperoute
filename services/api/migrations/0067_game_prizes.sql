-- The prizes of the shape game (TASK-423 part E, ADR-0351, docs/GIOCO.md
-- §5.4). The number is the first free one when the PR enters main. A
-- migration already in main is never edited: write the next one.

-- The silver and gold editions of a pace or milestone shape: its goal met in
-- 3 and in 10 different runs. A row each, beside the 'solo' one of the
-- unlock (the bronze edition) and the 'team' one of a challenge: written in
-- the transaction that saved the run that reached it, or by the backfill,
-- with that run. The check is widened, never narrowed: every row already
-- there ('solo', 'team') stays valid.
ALTER TABLE game_unlocks DROP CONSTRAINT IF EXISTS game_unlocks_edition_check;
ALTER TABLE game_unlocks
    ADD CONSTRAINT game_unlocks_edition_check
        CHECK (edition IN ('solo', 'team', 'silver', 'gold'));

-- What the account chose to show of the game on its public profile: one
-- frame (a collection completed), one title and up to 3 badges. No row, or
-- NULL and an empty list: nothing is shown (the default). The API takes only
-- prizes the account has, and the profile shows only those it still has.
CREATE TABLE game_prefs (
    user_id bigint PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    -- The id of a collection of game_catalog.py: its frame.
    frame text CHECK (length(frame) BETWEEN 1 AND 40),
    -- An id of game_prizes.TITLES.
    title text CHECK (length(title) BETWEEN 1 AND 40),
    -- Ids of game_prizes.BADGES, in the order chosen.
    badges text[] NOT NULL DEFAULT '{}' CHECK (cardinality(badges) <= 3),
    updated_at timestamptz NOT NULL
);
