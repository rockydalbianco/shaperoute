-- What the members write under a drawing (TASK-120, docs/DATABASE.md). A
-- migration already in main is never edited: write the next one.

-- One row for each comment. Whoever can see the drawing reads it: the
-- others while the drawing is public, its owner always. Deleting the
-- drawing (with its run), or the account of who wrote it, deletes it.
CREATE TABLE comments (
    -- What DELETE /comments/{id} is asked with: random, as drawings.id.
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id uuid NOT NULL REFERENCES drawings (id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- Plain text as written, without spaces at either end.
    text text NOT NULL CHECK (length(text) BETWEEN 1 AND 500),
    created_at timestamptz NOT NULL
);
-- The comments of a drawing, the oldest first, a page at a time.
CREATE INDEX comments_of_drawing ON comments (drawing_id, created_at, id);
-- The comments of an account, deleted with it.
CREATE INDEX comments_of_user ON comments (user_id);
