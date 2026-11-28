-- «Approve followers» (TASK-459 part A, ADR-0370, docs/DATABASE.md).
-- A migration already in main is never edited: write the next one.

-- Off: a member who asks to follow follows at once (follows.py). On: the
-- request waits for the owner, as since TASK-211. Off from the start, the
-- user's choice of 2026-11-28, but on for the accounts of before that have
-- a drawing for their followers: those drawings do not open to whoever
-- asks without a choice of their owner.
ALTER TABLE users ADD COLUMN approve_followers boolean NOT NULL DEFAULT false;

UPDATE users u SET approve_followers = true
WHERE EXISTS (
    SELECT 1 FROM drawings d WHERE d.user_id = u.id AND d.visibility = 'followers'
);

-- The requests still waiting for an account left open are accepted by
-- `python -m shaperoute_api.accepted_after_0091`, after this migration: a
-- migration sends no notifications, and whoever asked is told.

-- A follow at once is told to the one followed (push.py's `new_follower`):
-- the email of the notices keeps it too.
ALTER TABLE email_notices DROP CONSTRAINT email_notices_kind_check;
ALTER TABLE email_notices ADD CONSTRAINT email_notices_kind_check
    CHECK (kind IN ('follow_request', 'follow_accepted', 'new_follower',
                    'reaction', 'comment', 'tag'));
ALTER TABLE email_notices DROP CONSTRAINT email_notices_check;
ALTER TABLE email_notices ADD CONSTRAINT email_notices_check
    CHECK ((kind IN ('follow_request', 'follow_accepted', 'new_follower'))
           = (drawing_id IS NULL));
