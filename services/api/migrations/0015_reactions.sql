-- What the members leave under a drawing with one tap (TASK-119, ADR-0193,
-- docs/DATABASE.md). A migration already in main is never edited: write the
-- next one.

-- One row for each member who reacted to a drawing: one reaction each, so
-- the pair is the key. Whoever sees the drawing sees them: the others while
-- they see it, its owner always. Deleting the drawing (with its run), or the
-- account that reacted, deletes it.
CREATE TABLE reactions (
    drawing_id uuid NOT NULL REFERENCES drawings (id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- A code, never the emoji itself: the app draws it. The Sgrava heart is
    -- the super like; a new kind is a new migration and a line in the
    -- contract (packages/shared-types).
    kind text NOT NULL
        CHECK (kind IN ('super_like', 'fire', 'clap', 'strong', 'laugh', 'wow')),
    -- When it was left, or last changed to another kind.
    created_at timestamptz NOT NULL,
    PRIMARY KEY (drawing_id, user_id)
);
-- The reactions of an account, deleted with it.
CREATE INDEX reactions_of_user ON reactions (user_id);
