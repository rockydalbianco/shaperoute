-- The plans of the gym (TASK-411 part C, ADR-0341 point 3, docs/DATABASE.md).
-- A migration already in main is never edited: write the next one.

-- A plan of an account: a name, the days of the week it is for (bit 0 is
-- Monday, bit 6 Sunday), its exercises in order with the sets to do and the
-- values aimed at, and its place among the account's plans; when it reached
-- the API (its days before then were never skipped). The key is the
-- phone's, as a workout's: a plan made without a network goes up later, and
-- sent twice it is one row. Only its owner reads it; it goes with the
-- account.
CREATE TABLE gym_plans (
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    key text NOT NULL CHECK (key ~ '^[a-z0-9]{8,40}$'),
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
    days smallint NOT NULL DEFAULT 0 CHECK (days BETWEEN 0 AND 127),
    -- [{"exercise" | "name", "kind", "sets", and the fields of its kind}],
    -- checked by gym_plans.py.
    items jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(items) = 'array'),
    position smallint NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 100),
    updated_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL,
    PRIMARY KEY (user_id, key)
);

-- The plan a workout followed, by its key: the calendar writes its name,
-- and a day of the plan without a workout of it is a day skipped. A key,
-- not a reference: the workout may reach the API before its plan, and a
-- plan deleted leaves its workouts as they were.
ALTER TABLE gym_sessions
    ADD COLUMN plan_key text CHECK (plan_key ~ '^[a-z0-9]{8,40}$');
