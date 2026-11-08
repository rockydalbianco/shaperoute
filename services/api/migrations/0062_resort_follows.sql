-- The ski resorts a member follows (TASK-406 part D3, ADR-0338,
-- docs/DATABASE.md). A migration already in main is never edited: write
-- the next one.

-- «Your resorts» (the user's choice, 2026-11-08): the resorts followed come
-- first in the «Ski» search and in «Change» during a day of skiing. No
-- notification goes with them. Only the member sees them; they go with the
-- account, and with a resort gone from the source at an import.
CREATE TABLE resort_follows (
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    resort_id text NOT NULL REFERENCES ski_resorts (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL,
    PRIMARY KEY (user_id, resort_id)
);
