-- A post sent in a private message (TASK-455 part A, ADR-0382,
-- docs/DATABASE.md). A migration already in main is never edited: write the
-- next one.

-- `post` joins what a message carries. Unlike a drawing attached (0038), it
-- is a pointer and never a copy: the message keeps the drawing's id and
-- nothing of it, and each reader is shown the post only while it may see it
-- (drawings.drawing_seen_sql, asked again at every reading).
ALTER TABLE messages DROP CONSTRAINT messages_attachment_check;
ALTER TABLE messages ADD CONSTRAINT messages_attachment_check
    CHECK (attachment IN ('photo', 'video', 'drawing', 'post'));
-- The drawing sent. Null once it is deleted (with its run or its owner's
-- account): the message stays and says the post is no longer available.
ALTER TABLE messages
    ADD COLUMN post_id uuid REFERENCES drawings (id) ON DELETE SET NULL;
ALTER TABLE messages ADD CONSTRAINT messages_post_check
    CHECK (post_id IS NULL OR attachment = 'post');
-- The messages that point at a drawing, changed when it is deleted.
CREATE INDEX messages_of_post ON messages (post_id) WHERE post_id IS NOT NULL;
