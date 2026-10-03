-- Who follows whom, with a request the other accepts (TASK-211, ADR-0173,
-- docs/DATABASE.md). A migration already in main is never edited: write
-- the next one.

-- One row for each pair, in one direction: two people who follow each other
-- have two rows, each accepted by its own. Declining, withdrawing,
-- unfollowing and removing delete the row: nothing tells the one who asked
-- that the request was declined. Deleting either account deletes the row.
CREATE TABLE follows (
    follower_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    followed_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- Only an accepted request counts as following.
    status text NOT NULL CHECK (status IN ('pending', 'accepted')),
    asked_at timestamptz NOT NULL,
    -- When the followed one accepted; absent while pending.
    accepted_at timestamptz,
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id <> followed_id),
    CHECK ((status = 'accepted') = (accepted_at IS NOT NULL))
);

-- The followers and the requests of an account; the key reads the other way.
CREATE INDEX follows_followed_idx ON follows (followed_id, status);
