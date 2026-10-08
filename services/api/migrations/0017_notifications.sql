-- The two notification switches of an account (TASK-185, ADR-0206,
-- docs/DATABASE.md). A migration already in main is never edited: write the
-- next one.

ALTER TABLE users
    -- «Email notifications» and «Push notifications» of «Settings»: what the
    -- account chose, kept for when Sgrava sends something. Nothing is sent
    -- yet: no mail service, no push. Off for every account that never
    -- touched them, those of before too. Only its owner reads them (GET
    -- /me): never a profile, a search or a list.
    ADD COLUMN notify_email boolean NOT NULL DEFAULT false,
    ADD COLUMN notify_push boolean NOT NULL DEFAULT false;
