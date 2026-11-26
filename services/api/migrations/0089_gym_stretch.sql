-- The stretching at the end of a workout at the gym (TASK-466 part C,
-- ADR-0378, docs/DATABASE.md): «Remember to stretch», then the routine
-- «After gym», kept inside the workout it followed, not as a run of its own
-- (the user's choice of 2026-11-26, «Dentro l'allenamento»). One row for a
-- workout at most, gone with it; a workout without stretching has none.
-- A migration already in main is never edited: write the next one.

-- As a stretching session keeps it (0079): the routine's key on the phone,
-- the minutes it was chosen in and how many of its exercises were done,
-- with its seconds without the pauses, at most four hours.
CREATE TABLE gym_stretches (
    run_id bigint PRIMARY KEY REFERENCES gym_sessions (run_id) ON DELETE CASCADE,
    routine text NOT NULL CHECK (routine ~ '^[A-Za-z0-9_]{1,40}$'),
    minutes smallint NOT NULL CHECK (minutes BETWEEN 1 AND 60),
    duration_s integer NOT NULL CHECK (duration_s BETWEEN 1 AND 14400),
    exercises smallint NOT NULL CHECK (exercises BETWEEN 0 AND 100)
);
