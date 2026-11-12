-- The planned lives (TASK-468 part A2a, ADR-0381, docs/DATABASE.md): a live
-- made in advance, a race say, that the owner's followers see in the Feed
-- before it starts. The number is provisional: the first free one when it
-- is merged. A migration already in main is never edited: write the next
-- one.

-- One planned live: who, what, when, who may follow it, whether the heart
-- rate is shown; the post it became, once its owner posted the activity.
CREATE TABLE planned_lives (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    activity text NOT NULL,
    title text NOT NULL CHECK (length(title) BETWEEN 1 AND 60),
    starts_at timestamptz NOT NULL,
    audience_feed text NOT NULL
        CHECK (audience_feed IN ('followers', 'everyone')),
    heart_visible boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    post_id uuid REFERENCES drawings (id) ON DELETE SET NULL
);

-- An account's planned lives in time order: the Feed's row walks the
-- followed accounts, then these.
CREATE INDEX planned_lives_owner ON planned_lives (owner_id, starts_at, id);

-- «Remind me»: who wants a push when the live starts (the push itself
-- comes with part A2b). They go with the live, and with the account.
CREATE TABLE planned_live_reminders (
    planned_live_id uuid NOT NULL REFERENCES planned_lives (id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL,
    PRIMARY KEY (planned_live_id, user_id)
);

CREATE INDEX planned_live_reminders_user ON planned_live_reminders (user_id);

-- The share a planned live started. The link goes from the share to the
-- planned live, not back: the shares' rows stay out of the nightly copies
-- (deploy/backup.sh), and a key from a table in the copies to one left out
-- would break their restore.
ALTER TABLE live_shares
    ADD COLUMN planned_live_id uuid REFERENCES planned_lives (id) ON DELETE SET NULL;

CREATE INDEX live_shares_planned ON live_shares (planned_live_id)
    WHERE planned_live_id IS NOT NULL;

-- The Feed's row also shows the shares put in the Feed without planning
-- («Live in the Feed»): per account, the latest first.
CREATE INDEX live_shares_in_feed ON live_shares (user_id, created_at)
    WHERE audience_feed <> 'none';
