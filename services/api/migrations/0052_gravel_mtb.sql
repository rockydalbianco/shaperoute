-- Gravel and MTB join the activities of the API (TASK-378 part A, ADR-0322,
-- docs/DATABASE.md): saved as a run, kept as a favorite and proposed as a
-- group run as 'mountain_biking' and 'gravel_biking'. Each has personal
-- bests of its own, apart from a ride's (the user's choice 6): run_bests
-- takes them too. A migration already in main is never edited: write the
-- next one.

-- Each check is read back and widened, not written out again, as 0051 does:
-- the activities before stay, in their order, the new ones after them.
DO $$
DECLARE
    tab text;
    con text;
    kept text[];
BEGIN
    FOREACH tab IN ARRAY ARRAY['runs', 'favorites', 'group_runs', 'run_bests'] LOOP
        -- The bests name their sport, the others their activity (0042).
        con := tab || CASE WHEN tab = 'run_bests' THEN '_sport_check'
                           ELSE '_activity_check' END;
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
            'ALTER TABLE %I ADD CONSTRAINT %I CHECK (%I IN (%s))',
            tab,
            con,
            CASE WHEN tab = 'run_bests' THEN 'sport' ELSE 'activity' END,
            (SELECT string_agg(quote_literal(name), ', ' ORDER BY position)
               FROM (SELECT name, min(position) AS position
                       FROM unnest(kept || ARRAY['mountain_biking', 'gravel_biking'])
                            WITH ORDINALITY AS listed(name, position)
                      GROUP BY name) AS once)
        );
    END LOOP;
END
$$;
