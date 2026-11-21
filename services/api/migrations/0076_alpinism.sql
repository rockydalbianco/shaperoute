-- Alpinism joins the activities recorded without a shape (TASK-463,
-- ADR-0373, docs/DATABASE.md): a day in the mountains on rock, snow and ice
-- is saved as a run of the activity 'alpinism'. As a day of skiing (0044) and
-- a paragliding flight (0069) it has no route to do again and no personal
-- best: favorites, group runs and run_bests keep their checks as they are.
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
                   FROM unnest(kept || ARRAY['alpinism'])
                        WITH ORDINALITY AS listed(name, position)
                  GROUP BY name) AS once)
    );
END
$$;
