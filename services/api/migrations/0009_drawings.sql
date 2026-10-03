-- The runs an account shows the other members as drawings (TASK-117,
-- docs/DATABASE.md). A migration already in main is never edited: write the
-- next one.

-- One row for a run its owner titled or published; a run never touched has
-- none and is private. Deleting the run, or the account, deletes it.
CREATE TABLE drawings (
    -- What the others ask for it with: random, as users.public_id, so the
    -- drawings are not found by counting.
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id bigint NOT NULL UNIQUE REFERENCES runs (id) ON DELETE CASCADE,
    -- The name its owner gives it; absent: none.
    title text CHECK (length(title) BETWEEN 1 AND 60),
    public boolean NOT NULL DEFAULT false,
    -- What the others see of the run: its track without the first and the
    -- last 200 m along it, and without times (ADR-0114, point 4). Made from
    -- runs.track when the row is written; absent when nothing is left.
    track geometry(LineString, 4326),
    -- When it was last made public; absent while private.
    published_at timestamptz,
    updated_at timestamptz NOT NULL,
    CHECK (public = (published_at IS NOT NULL)),
    CHECK (NOT public OR track IS NOT NULL)
);
