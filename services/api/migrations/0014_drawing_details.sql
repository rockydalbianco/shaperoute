-- A run published like Strava (TASK-208, ADR-0170, docs/DATABASE.md): who
-- can see it, a description, the activity, up to 3 photos and the people
-- tagged. A migration already in main is never edited: write the next one.

-- Who can see a drawing: every member, the members who follow its owner
-- with the request accepted (follows), or only its owner. Every drawing
-- public before is seen by everyone, every private one only by its owner.
ALTER TABLE drawings
    ADD COLUMN visibility text NOT NULL DEFAULT 'only_me'
        CHECK (visibility IN ('everyone', 'followers', 'only_me')),
    -- «How did it go?»: the owner's words, lines and all; absent: none.
    ADD COLUMN description text CHECK (length(description) BETWEEN 1 AND 500);
UPDATE drawings SET visibility = 'everyone' WHERE public;
-- Its two checks go with it.
ALTER TABLE drawings DROP COLUMN public;
-- Kept for the SQL written before: true when every member sees it. Never
-- written; who may see a drawing is drawings.drawing_seen_sql.
ALTER TABLE drawings
    ADD COLUMN public boolean GENERATED ALWAYS AS (visibility = 'everyone') STORED,
    ADD CHECK ((visibility <> 'only_me') = (published_at IS NOT NULL)),
    ADD CHECK (visibility = 'only_me' OR track IS NOT NULL);

-- What the run was: every run saved before was on foot. The activities are
-- the API's (SUPPORTED_ACTIVITIES), as for the favorites (0010).
ALTER TABLE runs
    ADD COLUMN activity text NOT NULL DEFAULT 'running'
        CHECK (activity IN ('running', 'cycling', 'paddling'));

-- Up to 3 photos besides the map, in their places 1-3: a place emptied
-- stays empty, the others do not move. A JPEG made by the API from the
-- picture sent, at most 1080 px a side: never the file of the phone, so no
-- EXIF (where it was taken) is kept (ADR-0146). Deleting the drawing, so
-- its run or the account, deletes them.
CREATE TABLE drawing_photos (
    drawing_id uuid NOT NULL REFERENCES drawings (id) ON DELETE CASCADE,
    n smallint NOT NULL CHECK (n BETWEEN 1 AND 3),
    jpeg bytea NOT NULL CHECK (octet_length(jpeg) BETWEEN 1 AND 2000000),
    width smallint NOT NULL CHECK (width BETWEEN 1 AND 1080),
    height smallint NOT NULL CHECK (height BETWEEN 1 AND 1080),
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (drawing_id, n)
);

-- The members tagged in a drawing, in the order chosen, at most 10.
-- Deleting the account tagged deletes its tag: its name leaves the drawing.
CREATE TABLE drawing_tags (
    drawing_id uuid NOT NULL REFERENCES drawings (id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    position smallint NOT NULL CHECK (position BETWEEN 1 AND 10),
    PRIMARY KEY (drawing_id, user_id),
    UNIQUE (drawing_id, position)
);

-- Deleting an account finds its tags.
CREATE INDEX drawing_tags_user_idx ON drawing_tags (user_id);
