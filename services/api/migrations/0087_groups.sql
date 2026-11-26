-- Groups: communities that last, to go out together (TASK-495, ADR-0402,
-- docs/GRUPPI.md, docs/DATABASE.md). A migration already in main is never
-- edited: write the next one.

-- One row per group. `sports` holds 1 to 3 names of runs.activity, checked
-- by groups.py: a new sport needs no migration of this table. `area` is the
-- point of the city chosen, rounded by groups.py to about a kilometre:
-- never an address. `hidden_at` is set by whoever runs MuW from a report's
-- email (report_email.py): then only the members see the group.
CREATE TABLE groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
    description text CHECK (length(description) BETWEEN 1 AND 500),
    sports text[] NOT NULL CHECK (cardinality(sports) BETWEEN 1 AND 3),
    city text NOT NULL CHECK (length(city) BETWEEN 1 AND 80),
    area geography(Point, 4326) NOT NULL,
    access text NOT NULL CHECK (access IN ('public', 'request', 'invite')),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    hidden_at timestamptz
);
-- Explore: the groups within 50 km of the phone.
CREATE INDEX groups_area_idx ON groups USING GIST (area);

-- Its photo, as profile_photos.square_jpeg makes it.
CREATE TABLE group_photos (
    group_id uuid PRIMARY KEY REFERENCES groups (id) ON DELETE CASCADE,
    jpeg bytea NOT NULL,
    updated_at timestamptz NOT NULL
);

-- Who is in a group, with a role. One admin to a group, always: the index
-- below keeps a second one out, groups.py keeps one in (the role passed
-- before the admin leaves, or before its account is deleted). `muted` is
-- the member's «Mute»: no push of a new outing of this group.
CREATE TABLE group_members (
    group_id uuid NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('admin', 'coadmin', 'member')),
    muted boolean NOT NULL DEFAULT false,
    joined_at timestamptz NOT NULL,
    -- Since when it has its role: the oldest co-admin becomes the admin.
    role_since timestamptz NOT NULL,
    PRIMARY KEY (group_id, user_id)
);
CREATE UNIQUE INDEX group_members_one_admin_idx ON group_members (group_id)
    WHERE role = 'admin';
-- An account's groups, and the groups it is the admin of.
CREATE INDEX group_members_user_idx ON group_members (user_id, role);

-- Who asked to join a group that wants a request.
CREATE TABLE group_requests (
    group_id uuid NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL,
    PRIMARY KEY (group_id, user_id)
);
CREATE INDEX group_requests_user_idx ON group_requests (user_id);

-- Who was invited, and by whom; the invite goes with either account.
CREATE TABLE group_invites (
    group_id uuid NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    invited_by bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL,
    PRIMARY KEY (group_id, user_id)
);
CREATE INDEX group_invites_user_idx ON group_invites (user_id);

-- A group is reported as a post is (TASK-121, TASK-291): the list of 0083
-- with 'group'.
ALTER TABLE reports DROP CONSTRAINT reports_kind_check;
ALTER TABLE reports ADD CONSTRAINT reports_kind_check
    CHECK (kind IN ('drawing', 'comment', 'user', 'group_run', 'message',
        'outfit_tag', 'gear', 'group'));
