-- The nights of sleep a person publishes (TASK-467 part B1, ADR-0380,
-- docs/DATABASE.md). MuW works its sleep score out on the phone, from what
-- Apple Health holds (ADR-0379); the server keeps only the summary of a
-- night its owner published, never the samples: the score, the minutes
-- asleep and awake and, when a watch told them, the minutes in each stage.
-- A migration already in main is never edited: write the next one.

-- One row per night published. `night` is the day the person woke up, as
-- the phone's calendar has it: no hour of going to bed or of waking is
-- kept. `shared` is the owner's yes to showing it on the profile
-- (sleep.py), off until given. Deleting the account deletes its nights.
CREATE TABLE sleep_nights (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    night date NOT NULL,
    score smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
    asleep_min smallint NOT NULL CHECK (asleep_min BETWEEN 1 AND 1440),
    awake_min smallint NOT NULL CHECK (awake_min BETWEEN 0 AND 1440),
    -- Apple Health's «REM», «Core» (MuW's «Light») and «Deep»; null for a
    -- night no watch told the stages of.
    rem_min smallint,
    light_min smallint,
    deep_min smallint,
    shared boolean NOT NULL DEFAULT false,
    saved_at timestamptz NOT NULL,
    UNIQUE (user_id, night),
    -- The three stages together or none; sleep of no told stage is in
    -- asleep_min only, so they add up to it at most.
    CONSTRAINT sleep_nights_stages_check CHECK (
        (rem_min IS NULL) = (light_min IS NULL)
        AND (rem_min IS NULL) = (deep_min IS NULL)
        AND (
            rem_min IS NULL
            OR (
                rem_min >= 0
                AND light_min >= 0
                AND deep_min >= 0
                AND rem_min + light_min + deep_min <= asleep_min
            )
        )
    )
);

-- The last night a profile shows: the latest with the owner's yes.
CREATE INDEX sleep_nights_shared ON sleep_nights (user_id, night DESC)
    WHERE shared;

-- The night an activity's post shows («Sleep last night»): the activity
-- carries only the reference, and whether others see it. It starts shown,
-- the user's choice of 2026-11-12 («Resta acceso»): the switch is in sight
-- before «Publish». Without a night the column says nothing. Taking the
-- night off the server leaves the activity as it was, without it.
ALTER TABLE runs
    ADD COLUMN sleep_night_id bigint REFERENCES sleep_nights (id)
        ON DELETE SET NULL,
    ADD COLUMN sleep_shown boolean NOT NULL DEFAULT true;

CREATE INDEX runs_of_sleep_night ON runs (sleep_night_id)
    WHERE sleep_night_id IS NOT NULL;

-- Only what is published stays on the server: a night no activity carries
-- any more, and that is not on the profile, goes with the last activity
-- that carried it, however that one let go of it (deleted, or given
-- another night, or none). sleep.py does the same when `shared` is turned
-- off.
CREATE FUNCTION sleep_night_left() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM sleep_nights n
        WHERE n.id = OLD.sleep_night_id
        AND NOT n.shared
        AND NOT EXISTS (SELECT 1 FROM runs r WHERE r.sleep_night_id = n.id);
    RETURN NULL;
END;
$$;
CREATE TRIGGER runs_sleep_night_deleted
    AFTER DELETE ON runs
    FOR EACH ROW WHEN (OLD.sleep_night_id IS NOT NULL)
    EXECUTE FUNCTION sleep_night_left();
CREATE TRIGGER runs_sleep_night_changed
    AFTER UPDATE OF sleep_night_id ON runs
    FOR EACH ROW WHEN (
        OLD.sleep_night_id IS NOT NULL
        AND OLD.sleep_night_id IS DISTINCT FROM NEW.sleep_night_id
    )
    EXECUTE FUNCTION sleep_night_left();
