-- A stretching session (TASK-475, ADR-0386, docs/DATABASE.md): a run of the
-- activity 'stretching', with no track, as a workout at the gym (0047), the
-- routine it followed in a table of its own. No route to do again and no
-- personal best: favorites, group runs and run_bests keep their checks.
-- A migration already in main is never edited: write the next one.

-- The check of runs is read back and widened, not written out again, as
-- 0044 does: the activities before stay, in their order, the new one after
-- them, whichever migration widened it last.
DO $$
DECLARE
    kept text[];
BEGIN
    SELECT array_agg(quoted.value[1])
      INTO kept
      FROM pg_constraint,
           regexp_matches(pg_get_constraintdef(oid), '''([a-z_]+)''', 'g')
               AS quoted(value)
     WHERE conname = 'runs_activity_check';
    IF kept IS NULL THEN
        RAISE EXCEPTION 'runs_activity_check lists no activity';
    END IF;
    ALTER TABLE runs DROP CONSTRAINT runs_activity_check;
    EXECUTE format(
        'ALTER TABLE runs ADD CONSTRAINT runs_activity_check'
        ' CHECK (activity IN (%s))',
        (SELECT string_agg(quote_literal(name), ', ' ORDER BY position)
           FROM (SELECT name, min(position) AS position
                   FROM unnest(kept || ARRAY['stretching'])
                        WITH ORDINALITY AS listed(name, position)
                  GROUP BY name) AS once)
    );
END
$$;

-- A workout at the gym (0047) and a swim in a pool (0053) go without a
-- track; a stretching session does too. Every other run keeps its own.
ALTER TABLE runs DROP CONSTRAINT runs_track_check;
ALTER TABLE runs
    ADD CONSTRAINT runs_track_check
        CHECK (track IS NOT NULL OR activity IN ('gym', 'swimming', 'stretching'));

-- What a session keeps besides its run: the routine's key on the phone
-- (`morning`, `afterRun`, `afterGym`), the minutes it was chosen in and how
-- many of its exercises were done.
CREATE TABLE stretch_sessions (
    run_id bigint PRIMARY KEY REFERENCES runs (id) ON DELETE CASCADE,
    routine text NOT NULL CHECK (routine ~ '^[A-Za-z0-9_]{1,40}$'),
    minutes smallint NOT NULL CHECK (minutes BETWEEN 1 AND 60),
    exercises smallint NOT NULL CHECK (exercises BETWEEN 0 AND 100)
);
