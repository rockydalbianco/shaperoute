-- The phone number of an account (TASK-183, ADR-0150, docs/DATABASE.md). A
-- migration already in main is never edited: write the next one.

ALTER TABLE users
    -- In E.164, "+" and 8 to 15 digits, as the API writes it whatever the
    -- way it was typed; NULL without one, as every account of before. Not
    -- unique: nobody proved the number is theirs. Only its owner reads it
    -- (GET /me): it is for friends who already have the number to find the
    -- account, when that search exists.
    ADD COLUMN phone text
        CHECK (phone ~ '^\+[1-9][0-9]{7,14}$');
