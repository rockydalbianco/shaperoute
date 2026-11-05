-- A hike joins the activities of the API (TASK-377 part A, ADR-0321,
-- docs/DATABASE.md): saved as a run, kept as a favorite and proposed as a
-- group run as 'hiking'. A migration already in main is never edited: write
-- the next one.

-- Each check is read back and widened, not written out again, as 0047 does:
-- the activities before stay, in their order.
DO $$
DECLARE
    tab text;
    kept text[];
BEGIN
    FOREACH tab IN ARRAY ARRAY['runs', 'favorites', 'group_runs'] LOOP
        SELECT array_agg(quoted.value[1])
          INTO kept
          FROM pg_constraint,
               regexp_matches(pg_get_constraintdef(oid), '''([a-z_]+)''', 'g')
                   AS quoted(value)
         WHERE conname = tab || '_activity_check';
        IF kept IS NULL THEN
            RAISE EXCEPTION '%_activity_check lists no activity', tab;
        END IF;
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I',
                       tab, tab || '_activity_check');
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I CHECK (activity IN (%s))',
            tab,
            tab || '_activity_check',
            (SELECT string_agg(quote_literal(name), ', ' ORDER BY position)
               FROM (SELECT name, min(position) AS position
                       FROM unnest(kept || ARRAY['hiking'])
                            WITH ORDINALITY AS listed(name, position)
                      GROUP BY name) AS once)
        );
    END LOOP;
END
$$;
