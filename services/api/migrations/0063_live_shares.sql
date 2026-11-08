-- «Share live activity» (TASK-424, ADR-0352, docs/DATABASE.md): a link that
-- shows a recording live to whoever has it, without an account. A
-- migration already in main is never edited: write the next one.

-- One link: who made it, the hash of its token (the token itself is never
-- kept), the activity, until when it shows anything and the last numbers
-- the phone sent. `stats` and the points go when the link expires or is
-- stopped; the row, with nothing in it, a day later.
CREATE TABLE live_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash bytea NOT NULL UNIQUE CHECK (length(token_hash) = 32),
    activity text NOT NULL,
    -- A swim in a pool: the page shows its lengths, with no map.
    pool_length_m numeric(5, 2) CHECK (pool_length_m BETWEEN 10 AND 100),
    created_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL CHECK (expires_at >= created_at),
    finished_at timestamptz,
    stopped_at timestamptz,
    paused boolean NOT NULL DEFAULT false,
    stats jsonb,
    updated_at timestamptz
);

CREATE INDEX live_shares_user ON live_shares (user_id, created_at);
CREATE INDEX live_shares_expires ON live_shares (expires_at);

-- The track so far, one row a point, in the order the phone sent them: the
-- page asks for those after the last it has (`id`).
CREATE TABLE live_share_points (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    share_id uuid NOT NULL REFERENCES live_shares (id) ON DELETE CASCADE,
    lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lon double precision NOT NULL CHECK (lon BETWEEN -180 AND 180),
    at timestamptz NOT NULL
);

CREATE INDEX live_share_points_share ON live_share_points (share_id, id);
