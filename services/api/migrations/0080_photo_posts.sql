-- Posts of photos only (TASK-312 part C, ADR-0272, docs/IMPORTAZIONI.md §4,
-- docs/DATABASE.md): a drawing without a run. A migration already in main
-- is never edited: write the next one.

-- Who a drawing is of, kept on the drawing itself: the run's owner for the
-- drawings already there. Its readers ask the owner here, not through
-- runs, so a drawing without a run is seen, reacted to, commented on,
-- reported and blocked as any other (drawings.drawing_seen_sql).
ALTER TABLE drawings ADD COLUMN user_id bigint REFERENCES users (id) ON DELETE CASCADE;
UPDATE drawings d SET user_id = r.user_id FROM runs r WHERE r.id = d.run_id;
ALTER TABLE drawings ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX drawings_user_idx ON drawings (user_id);

-- A post of photos only has no run: the key its phone made for it instead,
-- as a run's, so a post sent again without network is the same one.
ALTER TABLE drawings ALTER COLUMN run_id DROP NOT NULL;
ALTER TABLE drawings
    ADD COLUMN key text CHECK (key ~ '^[a-z0-9]{8,40}$'),
    ADD CONSTRAINT drawings_user_key_key UNIQUE (user_id, key),
    ADD CONSTRAINT drawings_run_or_key_check CHECK ((run_id IS NULL) = (key IS NOT NULL));

-- Without a run: never «Only me», since its photos are on the server only
-- while others see it (ADR-0170), and never a line.
ALTER TABLE drawings
    ADD CONSTRAINT drawings_photo_post_check
        CHECK (run_id IS NOT NULL OR (visibility <> 'only_me' AND track IS NULL AND trackless));

-- A drawing of a run is published exactly while others may see it (0014).
-- One without a run waits for its first photo: published_at stays empty
-- until then, and the API sets it (photo_posts.py).
DO $$
DECLARE
    named text;
BEGIN
    SELECT conname
      INTO named
      FROM pg_constraint
     WHERE conrelid = 'drawings'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%published_at IS NOT NULL%'
       AND pg_get_constraintdef(oid) LIKE '%only_me%'
       AND pg_get_constraintdef(oid) NOT LIKE '%run_id%';
    IF named IS NULL THEN
        RAISE EXCEPTION 'drawings has no check of its published_at';
    END IF;
    EXECUTE format('ALTER TABLE drawings DROP CONSTRAINT %I', named);
END
$$;
ALTER TABLE drawings
    ADD CONSTRAINT drawings_published_check
        CHECK (run_id IS NULL OR (visibility <> 'only_me') = (published_at IS NOT NULL));
