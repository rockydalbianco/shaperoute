-- The profile picture of an account (TASK-178, ADR-0146; ADR-0115 keeps it
-- in the database, so the nightly copies take it with the rest). A migration
-- already in main is never edited: write the next one.

-- One row per account that has a picture; no row, no picture.
CREATE TABLE profile_photos (
    user_id bigint PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    -- A square JPEG, 256 px a side, made by the API from the picture sent:
    -- never the file of the phone, so no EXIF (where it was taken) is kept.
    jpeg bytea NOT NULL CHECK (octet_length(jpeg) BETWEEN 1 AND 200000),
    updated_at timestamptz NOT NULL
);
