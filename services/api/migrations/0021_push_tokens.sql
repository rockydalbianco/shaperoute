-- The push tokens of the phones, one row for each (TASK-262, ADR-0226,
-- docs/DATABASE.md). A migration already in main is never edited: write the
-- next one.

-- An Expo push token names one installation of the app on one phone. It
-- belongs to one account at a time: the account signed in on that phone
-- when the app sent it. Another account signing in on the same phone takes
-- it over, so a phone is never notified for someone who left it. Deleting
-- the account deletes its tokens.
CREATE TABLE push_tokens (
    -- "ExponentPushToken[…]", as the app got it from Expo.
    token text PRIMARY KEY CHECK (length(token) BETWEEN 1 AND 200),
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('ios', 'android')),
    -- The language of the app on that phone, for the texts of the
    -- notifications; absent when the app did not say, and then English.
    language text CHECK (language IN ('en', 'de', 'it', 'es', 'fr')),
    -- When the app sent it, the last time.
    updated_at timestamptz NOT NULL
);

-- The phones of an account: what one notification is sent to.
CREATE INDEX push_tokens_user_idx ON push_tokens (user_id);
