-- A wheelchair or a stroller joins the activities of the API (TASK-414 part
-- A, ADR-0343, docs/DATABASE.md): a circle, a heart, a star or a moon of 1-5
-- km on the wheel network, saved as a run, kept as a favorite and proposed
-- as a group run as 'wheelchair'. It has personal bests of its own over 1
-- and 5 km (the user's choice 7): run_bests takes it too, as 0055 does for a
-- skate. A migration already in main is never edited: write the next one.

-- Each check is read back and widened, not written out again, as 0055 and
-- 0068 do: the activities before stay, in their order, the new one after
-- them.
DO $$
DECLARE
    tab text;
    con text;
    kept text[];
BEGIN
    FOREACH tab IN ARRAY ARRAY['runs', 'favorites', 'group_runs', 'run_bests'] LOOP
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
                       FROM unnest(kept || ARRAY['wheelchair'])
                            WITH ORDINALITY AS listed(name, position)
                      GROUP BY name) AS once)
        );
    END LOOP;
END
$$;
