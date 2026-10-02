-- "Send to Strava": an account's Strava athlete and what was sent of each
-- run (TASK-187, ADR-0156, docs/DATABASE.md). A migration already in main
-- is never edited: write the next one.

-- A connection being made. POST /me/strava/connect gives the app a random
-- state; Strava hands it back to GET /strava/callback, which has nothing
-- else to tell whose connection it is. Only its SHA-256 is kept. A state is
-- used once, dies after ten minutes, and an account has one at a time.
CREATE TABLE strava_states (
    state_hash bytea PRIMARY KEY CHECK (length(state_hash) = 32),
    user_id bigint NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL
);

-- The Strava athlete of an account, with the tokens Strava gave for it.
-- The tokens are kept as they are: the API must send them back to Strava.
-- An access token lasts six hours; the refresh token is of no use without
-- the Client Secret, which is only in the server's environment. An athlete
-- is of one account at a time: Strava has one authorization for each.
CREATE TABLE strava_accounts (
    user_id bigint PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    athlete_id bigint NOT NULL UNIQUE,
    -- "Ada Lovelace", to show "Connected as …".
    athlete_name text NOT NULL CHECK (length(athlete_name) BETWEEN 1 AND 120),
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamptz NOT NULL,
    connected_at timestamptz NOT NULL
);

-- What Strava has of a run. No status: never sent. 'processing': Strava
-- took the file as the upload `strava_upload_id` and is still reading it.
-- 'sent': it is an activity; its id is absent only when Strava said it had
-- the run already without saying where.
ALTER TABLE runs
    ADD COLUMN strava_status text
        CHECK (strava_status IN ('processing', 'sent')),
    ADD COLUMN strava_upload_id bigint,
    ADD COLUMN strava_activity_id bigint,
    ADD CONSTRAINT runs_strava_processing_check
        CHECK (strava_status IS DISTINCT FROM 'processing'
               OR strava_upload_id IS NOT NULL),
    ADD CONSTRAINT runs_strava_never_sent_check
        CHECK (strava_status IS NOT NULL
               OR (strava_upload_id IS NULL AND strava_activity_id IS NULL)),
    ADD CONSTRAINT runs_strava_activity_check
        CHECK (strava_activity_id IS NULL OR strava_status = 'sent');
