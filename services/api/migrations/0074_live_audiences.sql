-- The live share in the chat and in the Feed (TASK-468 part A1a, ADR-0381,
-- docs/DATABASE.md): one share of a recording, seen in more ways. The
-- number is provisional: the first free one when it is merged. A migration
-- already in main is never edited: write the next one.

-- The link is now one of the ways, and optional: a share only in the chat
-- or the Feed has no token until its owner asks for the link.
ALTER TABLE live_shares ALTER COLUMN token_hash DROP NOT NULL;
-- Who sees it in the Feed: nobody, the owner's followers, everyone with an
-- account. The links made before are «none», as they were.
ALTER TABLE live_shares
    ADD COLUMN audience_feed text NOT NULL DEFAULT 'none'
        CHECK (audience_feed IN ('none', 'followers', 'everyone'));
-- The heart rate to the viewers in the app: off unless the owner turns it
-- on for this share. The link shows it as before (TASK-424, choice 3).
ALTER TABLE live_shares
    ADD COLUMN heart_visible boolean NOT NULL DEFAULT false;

-- The people a share was sent to in the chat: they may see it in the app.
-- They go with the share, and with their account.
CREATE TABLE live_share_recipients (
    share_id uuid NOT NULL REFERENCES live_shares (id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    sent_at timestamptz NOT NULL,
    PRIMARY KEY (share_id, user_id)
);

-- What the account was sent, and the rows its deletion removes.
CREATE INDEX live_share_recipients_user ON live_share_recipients (user_id);
