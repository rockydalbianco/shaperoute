-- The takeoffs and landings of free flying from OpenStreetMap, for the map
-- of takeoffs (TASK-493 part A, ADR-0400, docs/DATABASE.md). A migration
-- already in main is never edited: write the next one.

-- One row per site and kind, written by the extract
-- (flying_sites_extract.py) and read by GET /flying-sites. No user data:
-- the same rows for everyone, OSM data under the ODbL. A node or a way
-- tagged as takeoff and landing at once is two rows.
CREATE TABLE flying_sites (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Where it comes from: the id stays the same from one extract to the
    -- next, as the row is replaced by its OSM object and kind.
    osm_type text NOT NULL CHECK (osm_type IN ('node', 'way')),
    osm_id bigint NOT NULL CHECK (osm_id > 0),
    kind text NOT NULL CHECK (kind IN ('takeoff', 'landing')),
    -- WGS84, as (lon, lat) as PostGIS wants them; a way is the middle of
    -- its nodes.
    point geography(Point, 4326) NOT NULL,
    name text CHECK (length(name) BETWEEN 1 AND 120),
    -- OSM's `ele`, in metres, NULL when OSM has none (or not a number).
    ele_m integer CHECK (ele_m BETWEEN -500 AND 9000),
    -- The wind directions the site faces (free_flying:site_orientation),
    -- as compass points; empty when OSM does not say.
    orientation text[] NOT NULL DEFAULT '{}' CHECK (
        orientation <@ ARRAY[
            'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
            'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
        ]::text[]
    ),
    -- free_flying:official: yes, no, or NULL when OSM does not say.
    official boolean,
    updated_at timestamptz NOT NULL,
    UNIQUE (osm_type, osm_id, kind)
);

-- The sites of a box of the map, and the landings near a takeoff.
CREATE INDEX flying_sites_point ON flying_sites USING gist (point);
