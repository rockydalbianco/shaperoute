-- A night of sleep as a post of its own (TASK-467 part E, ADR-0380
-- precisazione E, docs/DATABASE.md): a drawing without a run, as a post of
-- photos only (0080), that carries the night it shows. A migration already
-- in main is never edited: write the next one.

-- The night the post is of. Only a drawing without a run has one of its
-- own (a run's night is on the run, 0072), and it is published as it is
-- made: it has its night, it waits for no photo. One post a night. A night
-- taken off the server takes its post with it.
ALTER TABLE drawings
    ADD COLUMN sleep_night_id bigint REFERENCES sleep_nights (id)
        ON DELETE CASCADE,
    ADD CONSTRAINT drawings_sleep_post_check
        CHECK (
            sleep_night_id IS NULL
            OR (run_id IS NULL AND published_at IS NOT NULL)
        );
CREATE UNIQUE INDEX drawings_of_sleep_night ON drawings (sleep_night_id)
    WHERE sleep_night_id IS NOT NULL;

-- Only what is published stays (0072): a night is kept while its owner
-- shares it on the profile, an activity carries it, or, from here on, a
-- post is of it.
CREATE OR REPLACE FUNCTION sleep_night_left() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM sleep_nights n
        WHERE n.id = OLD.sleep_night_id
        AND NOT n.shared
        AND NOT EXISTS (SELECT 1 FROM runs r WHERE r.sleep_night_id = n.id)
        AND NOT EXISTS (
            SELECT 1 FROM drawings d WHERE d.sleep_night_id = n.id
        );
    RETURN NULL;
END;
$$;

-- A post of a night deleted, by its owner or by anyone who may delete a
-- post: its night goes when nothing else publishes it.
CREATE TRIGGER drawings_sleep_night_deleted
    AFTER DELETE ON drawings
    FOR EACH ROW WHEN (OLD.sleep_night_id IS NOT NULL)
    EXECUTE FUNCTION sleep_night_left();
