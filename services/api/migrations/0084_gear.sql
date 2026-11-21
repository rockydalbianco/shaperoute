-- A member's gear (TASK-486, ADR-0393, docs/DATABASE.md): shoes, bikes,
-- skis, helmets, harnesses, sails, anything, each with its brand, a name, a
-- note and a photo; hooked to the activities it went on, which give it its
-- metres and hours. A migration already in main is never edited: write the
-- next one.

-- One item. `kind` from a fixed list that may only grow (gear.py,
-- GearKind). `off_profile` is its owner's «Hide from profile»: its totals
-- still count. `hidden_at` is set by whoever runs MuW from a report's email
-- (report_email.py): then only its owner sees it. `retired_at` takes it out
-- of the choice at the end of an activity, never out of the history.
CREATE TABLE gear (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('shoes', 'bike', 'skis', 'ski_boots',
        'snowboard', 'poles', 'boots', 'climbing_shoes', 'harness', 'helmet',
        'rope', 'crampons', 'ice_axe', 'snowshoes', 'inline_skates', 'sail',
        'board', 'paddle', 'boat', 'wetsuit', 'paraglider', 'wheelchair',
        'clothing', 'backpack', 'watch', 'other')),
    brand text NOT NULL CHECK (length(brand) BETWEEN 1 AND 40),
    model text CHECK (length(model) BETWEEN 1 AND 80),
    name text CHECK (length(name) BETWEEN 1 AND 40),
    bought_on date CHECK (bought_on >= DATE '1950-01-01'),
    note text CHECK (length(note) BETWEEN 1 AND 500),
    -- A limit in metres (700 km for shoes): reached, the app says so.
    limit_m integer CHECK (limit_m BETWEEN 1000 AND 100000000),
    off_profile boolean NOT NULL DEFAULT false,
    retired_at timestamptz,
    hidden_at timestamptz,
    created_at timestamptz NOT NULL
);
CREATE INDEX gear_user_idx ON gear (user_id, created_at);

-- Its photo, as gear.py made it: upright, at most PHOTO_SIDE pixels on its
-- longer side, saved again as JPEG without the EXIF of the phone.
CREATE TABLE gear_photos (
    gear_id uuid PRIMARY KEY REFERENCES gear (id) ON DELETE CASCADE,
    jpeg bytea NOT NULL,
    updated_at timestamptz NOT NULL
);

-- The activities an item went on: at most 10 items to an activity
-- (gear.py). An activity deleted, or an item, takes the row along.
CREATE TABLE activity_gear (
    run_id bigint NOT NULL REFERENCES runs (id) ON DELETE CASCADE,
    gear_id uuid NOT NULL REFERENCES gear (id) ON DELETE CASCADE,
    PRIMARY KEY (run_id, gear_id)
);
CREATE INDEX activity_gear_gear_idx ON activity_gear (gear_id);

-- The items chosen already at the end of an activity of a sport: more than
-- one for a sport (shoes and a helmet). The names of runs.activity, checked
-- by gear.py, not here: a new sport needs no migration of this table.
CREATE TABLE gear_defaults (
    gear_id uuid NOT NULL REFERENCES gear (id) ON DELETE CASCADE,
    activity text NOT NULL CHECK (activity ~ '^[a-z_]{1,40}$'),
    PRIMARY KEY (gear_id, activity)
);

-- An item tagged on a photo may come from its owner's gear (part F): the
-- tag keeps its own brand and model, and loses the link when the item goes.
ALTER TABLE drawing_outfit_tags
    ADD COLUMN gear_id uuid REFERENCES gear (id) ON DELETE SET NULL;

-- An item of gear is reported too (moderation.py): the list of 0050, with
-- 'gear'.
ALTER TABLE reports DROP CONSTRAINT reports_kind_check;
ALTER TABLE reports ADD CONSTRAINT reports_kind_check
    CHECK (kind IN ('drawing', 'comment', 'user', 'group_run', 'message',
        'outfit_tag', 'gear'));
