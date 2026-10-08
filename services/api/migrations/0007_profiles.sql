-- The profile of an account: its bio, and the id the others reach it by
-- (TASK-116, ADR-0128, docs/DATABASE.md). A migration already in main is
-- never edited: write the next one.

ALTER TABLE users
    -- A few words about the person, shown on the profile; empty: none.
    -- Every account of before starts with none.
    ADD COLUMN bio text NOT NULL DEFAULT ''
        CHECK (length(bio) <= 160),
    -- What GET /users/{id} is asked with: random, so a profile is not found
    -- by counting, and the number of accounts is not told. `id` stays inside
    -- the API. Each account of before gets its own when the column is added.
    ADD COLUMN public_id uuid NOT NULL DEFAULT gen_random_uuid()
        CONSTRAINT users_public_id_key UNIQUE;
