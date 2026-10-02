-- The routes an account keeps as favorites (TASK-171, ADR-0139,
-- docs/DATABASE.md). A migration already in main is never edited: write the
-- next one.

-- The first geometry of the schema; the image has PostGIS already.
CREATE EXTENSION IF NOT EXISTS postgis;

-- One row per route kept. The route is a copy, whole: it stays as it was
-- kept even when the catalogue it came from changes, and a route drawn on
-- the phone is nowhere else.
CREATE TABLE favorites (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- The name the app gives the route, made from its line: the same route
    -- is one favorite, from any phone and however it was reached.
    key text NOT NULL CHECK (key ~ '^[a-z0-9]{8,40}$'),
    -- A city of the catalogue ("milano"), or empty for a route drawn.
    city text NOT NULL CHECK (length(city) <= 80),
    -- What the route draws: a shape, a word with its style, or neither (an
    -- image, a themed route), which `title` may name.
    shape text CHECK (length(shape) <= 40),
    word text CHECK (length(word) <= 40),
    style text CHECK (style IN ('round', 'block')),
    title text CHECK (length(title) <= 60),
    -- The distance asked for, and the one on the roads, in metres.
    distance_m integer NOT NULL CHECK (distance_m > 0),
    route_m integer NOT NULL CHECK (route_m > 0),
    similarity real NOT NULL CHECK (similarity BETWEEN 0 AND 1),
    -- WGS84, points as (lon, lat), as PostGIS wants them.
    line geometry(LineString, 4326) NOT NULL,
    created_at timestamptz NOT NULL,
    UNIQUE (user_id, key)
);

-- The list of an account, the newest first.
CREATE INDEX favorites_user_created_idx
    ON favorites (user_id, created_at DESC, id DESC);
