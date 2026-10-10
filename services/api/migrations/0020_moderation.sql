-- Blocking and reporting (TASK-121, ADR-0228, docs/DATABASE.md). A
-- migration already in main is never edited: write the next one.

-- Who blocked whom: one row for each pair, in one direction. Either row
-- keeps the two apart both ways: neither sees the other's drawings,
-- comments, reactions, profile or name in a search. Unblocking deletes the
-- row; deleting either account deletes it too.
CREATE TABLE blocks (
    blocker_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    blocked_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

-- "Is there a block between these two?" read from the other side too.
CREATE INDEX blocks_blocked_idx ON blocks (blocked_id);

-- What a member reported: a drawing, a comment or a member, with a reason
-- from a short list. One row for each reporter and thing: reported again,
-- the row takes the new reason and time. Kept for whoever runs the app to
-- read in the database; no endpoint reads them. Deleting the reporter's
-- account deletes its reports. `target_id` is the drawing's id, the
-- comment's id or the member's public_id: no foreign key, so a report
-- outlives the thing reported.
CREATE TABLE reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('drawing', 'comment', 'user')),
    target_id uuid NOT NULL,
    reason text NOT NULL CHECK (
        reason IN ('spam', 'offensive', 'harassment', 'sexual', 'other')
    ),
    created_at timestamptz NOT NULL,
    UNIQUE (reporter_id, kind, target_id)
);

-- The reports of one thing, for whoever reads them.
CREATE INDEX reports_target_idx ON reports (kind, target_id);
