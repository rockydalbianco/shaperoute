-- The outings of a group (TASK-495 part C, ADR-0402, docs/GRUPPI.md §6 and
-- §12, docs/DATABASE.md): the group runs of 0032 with the group beside
-- them, for its members only («group») or for everyone in a public group,
-- and with no route at all for alpinism and the sports recorded without
-- one: a meeting point picked on the map, a day, a time and a written
-- «Destination». A group run without a group stays as in 0032.
-- A migration already in main is never edited: write the next one.

-- The group an outing belongs to; gone with the group.
ALTER TABLE group_runs
    ADD COLUMN group_id uuid REFERENCES groups (id) ON DELETE CASCADE;

-- «Destination», one line, only for an outing without a route
-- («Cima Tosa, normal route»).
ALTER TABLE group_runs
    ADD COLUMN destination text CHECK (length(destination) BETWEEN 1 AND 80);

-- Without a route there is no line, and nothing measured on it. `start`
-- stays: the first point of the line, or the meeting point on the map.
ALTER TABLE group_runs
    ALTER COLUMN line DROP NOT NULL,
    ALTER COLUMN distance_m DROP NOT NULL,
    ALTER COLUMN route_m DROP NOT NULL,
    ALTER COLUMN similarity DROP NOT NULL;

-- «group» for the members only. A group run without a group is for
-- everyone or the followers, as before; an outing of a group is for its
-- members or for everyone (no «Followers», GRUPPI.md §6).
ALTER TABLE group_runs
    DROP CONSTRAINT group_runs_visibility_check,
    ADD CONSTRAINT group_runs_visibility_check CHECK (
        (group_id IS NULL AND visibility IN ('everyone', 'followers'))
        OR (group_id IS NOT NULL AND visibility IN ('group', 'everyone'))
    );

-- A route has all it measured and no «Destination»; an outing without a
-- route belongs to a group, says where it goes and measures nothing.
ALTER TABLE group_runs
    ADD CONSTRAINT group_runs_route_check CHECK (
        (line IS NOT NULL
            AND distance_m IS NOT NULL AND route_m IS NOT NULL
            AND similarity IS NOT NULL
            AND destination IS NULL)
        OR (line IS NULL
            AND group_id IS NOT NULL
            AND destination IS NOT NULL
            AND distance_m IS NULL AND route_m IS NULL AND similarity IS NULL)
    );

-- An outing without a route is of a sport recorded outdoors (runs.activity
-- but the gym and the stretching): group_runs_activity_check takes them
-- all. The activities of a route stay the API's to check (POST /routes, as
-- for a favorite). The check is read back and widened, not written out
-- again, as 0055, 0068 and 0071 do, and keeps its name: the next sport's
-- migration widens it the same way.
DO $$
DECLARE
    kept text[];
BEGIN
    SELECT array_agg(quoted.value[1])
      INTO kept
      FROM pg_constraint,
           regexp_matches(pg_get_constraintdef(oid), '''([a-z_]+)''', 'g')
               AS quoted(value)
     WHERE conname = 'group_runs_activity_check';
    IF kept IS NULL THEN
        RAISE EXCEPTION 'group_runs_activity_check lists no activity';
    END IF;
    ALTER TABLE group_runs DROP CONSTRAINT group_runs_activity_check;
    EXECUTE format(
        'ALTER TABLE group_runs ADD CONSTRAINT group_runs_activity_check'
        ' CHECK (activity IN (%s))',
        (SELECT string_agg(quote_literal(name), ', ' ORDER BY position)
           FROM (SELECT name, min(position) AS position
                   FROM unnest(kept || ARRAY[
                            'swimming', 'hiking', 'mountain_biking',
                            'inline_skating', 'snowshoeing', 'wheelchair',
                            'walking', 'gravel_biking', 'skiing', 'xc_skiing',
                            'ski_touring', 'paragliding', 'alpinism'])
                        WITH ORDINALITY AS listed(name, position)
                  GROUP BY name) AS once)
    );
END
$$;

-- A group's page: its outings by their day.
CREATE INDEX group_runs_group_idx ON group_runs (group_id, starts_at)
    WHERE group_id IS NOT NULL;
