-- Snowshoeing joins the activities of the API (TASK-413 part A2, ADR-0342,
-- docs/DATABASE.md): a small shape placed freely on the snow, saved as a run,
-- kept as a favorite and proposed as a group run as 'snowshoeing'. As a hike
-- it has no personal best (the user's choice 5): run_bests keeps its check
-- as it is. A migration already in main is never edited: write the next one.

-- Each check is read back and widened, not written out again, as 0055 does:
-- the activities before stay, in their order, the new one after them.
DO $$
DECLARE
    tab text;
    con text;
    kept text[];
BEGIN
    FOREACH tab IN ARRAY ARRAY['runs', 'favorites', 'group_runs'] LOOP
        con := tab || '_activity_check';
        SELECT array_agg(quoted.value[1])
          INTO kept
          FROM pg_constraint,
               regexp_matches(pg_get_constraintdef(oid), '''([a-z_]+)''', 'g')
                   AS quoted(value)
         WHERE conname = con;
        IF kept IS NULL THEN
            RAISE EXCEPTION '% lists no activity', con;
        END IF;
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', tab, con);
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I CHECK (activity IN (%s))',
            tab,
            con,
            (SELECT string_agg(quote_literal(name), ', ' ORDER BY position)
               FROM (SELECT name, min(position) AS position
                       FROM unnest(kept || ARRAY['snowshoeing'])
                            WITH ORDINALITY AS listed(name, position)
                      GROUP BY name) AS once)
        );
    END LOOP;
END
$$;
