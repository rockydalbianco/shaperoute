-- Answers to a comment, and the reactions left on a comment (TASK-454 part
-- C1, ADR-0377, docs/DATABASE.md). A migration already in main is never
-- edited: write the next one.

-- A reply is a comment with the comment it stands under: one level, so
-- `parent_id` is always a comment without a parent (comments.py checks it:
-- an answer to a reply goes under the same comment). Deleting a comment
-- deletes its replies.
ALTER TABLE comments
    ADD COLUMN parent_id uuid REFERENCES comments (id) ON DELETE CASCADE;
-- Who a reply to a reply answers, shown as «@name» before its words; null
-- for a reply to the comment itself, and once that account is deleted.
ALTER TABLE comments
    ADD COLUMN mention_user_id bigint REFERENCES users (id) ON DELETE SET NULL;
-- The replies of a comment, the oldest first, a page at a time.
CREATE INDEX comments_of_parent ON comments (parent_id, created_at, id)
    WHERE parent_id IS NOT NULL;
-- The replies that name an account, changed when it is deleted.
CREATE INDEX comments_mentioning ON comments (mention_user_id)
    WHERE mention_user_id IS NOT NULL;

-- One row for each member who reacted to a comment or to a reply: one
-- reaction each, so the pair is the key. Whoever reads the comment sees how
-- many of each kind, never who left them. Deleting the comment (with its
-- drawing), or the account that reacted, deletes it.
CREATE TABLE comment_reactions (
    comment_id uuid NOT NULL REFERENCES comments (id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- The codes of the drawings' reactions (0015_reactions.sql) without the
    -- MuW heart: the super like is a drawing's only (the user's choice).
    kind text NOT NULL CHECK (kind IN ('fire', 'clap', 'strong', 'laugh', 'wow')),
    -- When it was left, or last changed to another kind.
    created_at timestamptz NOT NULL,
    PRIMARY KEY (comment_id, user_id)
);
-- The reactions of an account, deleted with it.
CREATE INDEX comment_reactions_of_user ON comment_reactions (user_id);
