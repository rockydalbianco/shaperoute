-- The runs an account recorded: "My activities" (TASK-172, ADR-0140,
-- docs/DATABASE.md). A migration already in main is never edited: write the
-- next one.

-- One row per run, with a planned route or without one. Only its owner sees
-- it; what the others may see of a run (a title, "Public", the track cut at
-- both ends) comes with TASK-117, in a migration of its own.
CREATE TABLE runs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- The name the app gives the run, made from its track: the same run sent
    -- twice is one row.
    key text NOT NULL CHECK (key ~ '^[a-z0-9]{8,40}$'),
    -- The planned route and how much it looks like its shape; both absent
    -- for a run without a route. WGS84, points as (lon, lat).
    route geometry(LineString, 4326),
    route_similarity real CHECK (route_similarity BETWEEN 0 AND 1),
    -- What the route draws, as in `favorites`: a shape, a word with its
    -- style, or neither (an image, a themed route), which `title` may name.
    shape text CHECK (length(shape) <= 40),
    word text CHECK (length(word) <= 40),
    style text CHECK (style IN ('round', 'block')),
    title text CHECK (length(title) <= 60),
    -- Where the runner was, without the fixes the engine does not believe.
    -- M is the seconds since the first point, pauses included.
    track geometry(LineStringM, 4326) NOT NULL,
    -- The pauses, as [{"from_s", "to_s", "auto"}] on the clock of M: what
    -- happened in them is not of the run.
    pauses jsonb NOT NULL DEFAULT '[]',
    -- When the first point was taken.
    started_at timestamptz NOT NULL,
    -- Metres and seconds of the run, pauses left out; counted by the API.
    distance_m integer NOT NULL CHECK (distance_m >= 0),
    duration_s integer NOT NULL CHECK (duration_s >= 0),
    -- The engine's score of the track against the route (ADR-0090); absent
    -- without a route, or when the run is too short to judge.
    score integer CHECK (score BETWEEN 0 AND 100),
    fidelity real CHECK (fidelity BETWEEN 0 AND 1),
    -- The name of the place the run starts from ("Trento"), when found.
    place text CHECK (length(place) <= 80),
    created_at timestamptz NOT NULL,
    UNIQUE (user_id, key),
    CHECK ((route IS NULL) = (route_similarity IS NULL)),
    CHECK ((score IS NULL) = (fidelity IS NULL)),
    CHECK (route IS NOT NULL OR score IS NULL)
);

-- The list of an account, the latest run first, a page at a time.
CREATE INDEX runs_user_started_idx
    ON runs (user_id, started_at DESC, id DESC);
