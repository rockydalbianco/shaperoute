-- The previews of a run (TASK-501 part A, ADR-0249, docs/DATABASE.md). A
-- migration already in main is never edited: write the next one.

-- «My activities» shows each run of a page as two light lines: at most 64
-- points of its track and of its planned route (recommended.preview). The
-- list read both lines whole to choose them, thousands of points for a run
-- of an hour. PostgreSQL keeps them now, as it keeps a drawing's since 0022:
-- the same function, the track without its M (the seconds), the route as it
-- is. NULL without a track (a workout at the gym) and without a route.
-- Written by PostgreSQL at every write of the line, and now for the runs
-- already there: the table is written again, once.
ALTER TABLE runs
    ADD COLUMN track_preview geometry(LineString, 4326)
        GENERATED ALWAYS AS (drawing_preview(ST_Force2D(track))) STORED,
    ADD COLUMN route_preview geometry(LineString, 4326)
        GENERATED ALWAYS AS (drawing_preview(route)) STORED;
