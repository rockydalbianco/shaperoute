-- A swim in a pool (TASK-400, ADR-0334, docs/DATABASE.md): a run of the
-- activity 'swimming', with no track, its pool and its lengths in a table of
-- its own. A migration already in main is never edited: write the next one.

-- A workout at the gym went without a track (0047); a swim in a pool does
-- too. Every other run keeps the one it always had.
ALTER TABLE runs DROP CONSTRAINT runs_track_check;
ALTER TABLE runs
    ADD CONSTRAINT runs_track_check
        CHECK (track IS NOT NULL OR activity IN ('gym', 'swimming'));

-- What a swim in a pool keeps besides its run: the length of the pool, in
-- metres to the centimetre (33.33 m), and how many lengths the swimmer
-- wrote at the end. The run's distance_m is the two multiplied.
CREATE TABLE pool_swims (
    run_id bigint PRIMARY KEY REFERENCES runs (id) ON DELETE CASCADE,
    pool_length_m numeric(5, 2) NOT NULL CHECK (pool_length_m BETWEEN 10 AND 100),
    lengths integer NOT NULL CHECK (lengths BETWEEN 1 AND 1000)
);
