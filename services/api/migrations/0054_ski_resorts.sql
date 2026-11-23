-- The ski resorts of the world, for the «Ski» search and the day of skiing
-- (TASK-406 part A, ADR-0338, docs/DATABASE.md). A migration already in
-- main is never edited: write the next one.

-- One row per resort, written by the import (resort_import.py) and read by
-- GET /ski-resorts. No user data: the same rows for everyone, replaced at
-- each import by the id of the source.
CREATE TABLE ski_resorts (
    -- The id the source gives the resort, stable from one import to the next.
    id text PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 80),
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    -- ISO 3166-1 alpha-2 and the region's name, NULL when the source has none.
    country text CHECK (country ~ '^[A-Z]{2}$'),
    region text CHECK (length(region) <= 120),
    -- WGS84, as (lon, lat) as PostGIS wants them; the box in degrees, for
    -- the map of the resort's page.
    center geography(Point, 4326) NOT NULL,
    south double precision NOT NULL,
    west double precision NOT NULL,
    north double precision NOT NULL,
    east double precision NOT NULL,
    CHECK (south <= north AND west <= east),
    lifts integer NOT NULL CHECK (lifts >= 0),
    -- The downhill pistes: in all, and by difficulty ({"easy": 12.5, ...}).
    piste_km real NOT NULL CHECK (piste_km >= 0),
    piste_km_by_difficulty jsonb NOT NULL DEFAULT '{}'
        CHECK (jsonb_typeof(piste_km_by_difficulty) = 'object'),
    min_elevation_m integer,
    max_elevation_m integer,
    website text CHECK (website ~ '^https?://' AND length(website) <= 300),
    updated_at timestamptz NOT NULL
);

-- The resorts near a position («Record your day», the nearest first).
CREATE INDEX ski_resorts_center ON ski_resorts USING gist (center);
