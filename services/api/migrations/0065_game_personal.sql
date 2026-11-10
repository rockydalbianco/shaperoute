-- The personal challenges and the streak of the shape game (TASK-423 part C,
-- ADR-0351, docs/GIOCO.md §6.6–6.7). The number is the first free one when
-- the PR enters main. A migration already in main is never edited: write the
-- next one.

-- The minutes the phone's clock was ahead of UTC when the run started (+60
-- in Rome in winter), sent by the app with the run: the local hour and day of
-- the personal challenges, and the local week of the streak. Never a place.
-- NULL for the runs saved before, or by an app that does not send it: UTC.
-- The backfill keeps it (game.record).
ALTER TABLE game_runs
    ADD COLUMN utc_offset_min smallint
        CHECK (utc_offset_min BETWEEN -840 AND 840);

-- The highest step (1 bronze, 2 silver, 3 gold) an account reached in a
-- personal challenge of a week or a month, written in the transaction that
-- saved the run that reached it. A step stays once reached, like a shape:
-- deleting the run keeps the row, without the run. Deleting the account
-- deletes them.
CREATE TABLE game_personal (
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- The local Monday of the week, or the first day of the month.
    period_start date NOT NULL,
    -- An id of game_personal.py: 'week_km', 'month_early'.
    challenge_id text NOT NULL CHECK (length(challenge_id) BETWEEN 1 AND 40),
    tier smallint NOT NULL CHECK (tier BETWEEN 1 AND 3),
    -- When the step was reached: the save of its run.
    done_at timestamptz NOT NULL,
    run_id bigint REFERENCES runs (id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, period_start, challenge_id)
);
