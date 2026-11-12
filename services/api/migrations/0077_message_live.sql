-- A live share sent in a private message (TASK-468 part A1b, ADR-0381,
-- docs/DATABASE.md). A migration already in main is never edited: write the
-- next one.

-- `live` joins what a message carries, with every kind before it (0038,
-- 0074). As a post, a pointer: the message keeps the share's id and nothing
-- of it, and each reader is shown its card only while it may see the share
-- (live_shares.MAY_SEE_SQL, asked again at every reading).
ALTER TABLE messages DROP CONSTRAINT messages_attachment_check;
ALTER TABLE messages ADD CONSTRAINT messages_attachment_check
    CHECK (attachment IN ('photo', 'video', 'drawing', 'post', 'live'));
-- The share sent, **without a foreign key**: the nightly copies keep the
-- messages and leave the shares' rows out (deploy/backup.sh), and a key
-- from one to the other would make their restore fail. Once the share's
-- row goes (a day after it ended) the id points at nothing: the card is
-- null and the app says the live has ended.
ALTER TABLE messages ADD COLUMN live_share_id uuid;
ALTER TABLE messages ADD CONSTRAINT messages_live_check
    CHECK (live_share_id IS NULL OR attachment = 'live');
