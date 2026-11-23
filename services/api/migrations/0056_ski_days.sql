-- A day of skiing's resort, gear and snow (TASK-406 part D1, ADR-0338,
-- docs/DATABASE.md). A migration already in main is never edited: write
-- the next one.

-- Written by PUT /me/activities/{key}/ski, after the day is saved, and
-- only on a day of skiing; NULL when the skier gave none. The resort is
-- the one of the «Ski» search (0054): a resort gone from the source at an
-- import leaves the day without one. The gear is free text, «ski» or
-- «snowboard» with brand and model (the user's choice, 2026-11-06); the
-- snow one of five, chosen at the end of the day (2026-11-07).
ALTER TABLE runs
    ADD COLUMN ski_resort_id text REFERENCES ski_resorts (id) ON DELETE SET NULL,
    ADD COLUMN ski_gear text CHECK (length(ski_gear) BETWEEN 1 AND 60),
    ADD COLUMN snow text
        CHECK (snow IN ('powder', 'groomed', 'icy', 'spring', 'heavy'));

-- The snow of the members at a resort in the last hours (GET
-- /ski-resorts/{id}/snow), and the resort's days.
CREATE INDEX runs_ski_resort ON runs (ski_resort_id, started_at DESC)
    WHERE ski_resort_id IS NOT NULL;
