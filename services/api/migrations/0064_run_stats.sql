-- The figures of a run beyond its metres and seconds, for the page of its
-- post (TASK-410 part C, ADR-0340, docs/DATABASE.md, run_stats.py): the
-- splits per kilometre and per mile the API counts from the track, and what
-- the phone sends at the end of the activity (the elevation profile, the
-- cadence, the calories). One row per run at most; a run without one, as
-- every run saved before this table, has none of them. The heart rate is
-- not here: it is on the run (runs.heart_*, TASK-409 B), as is whether
-- others see it. A migration already in main is never edited: write the
-- next one.
CREATE TABLE run_stats (
    run_id bigint PRIMARY KEY REFERENCES runs (id) ON DELETE CASCADE,
    -- {"splits_km", "splits_mile", "elevation", "cadence_spm", "kcal"}, each
    -- absent or null when the run has none (run_stats.py, RunStatsBody).
    stats jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(stats) = 'object'),
    updated_at timestamptz NOT NULL
);
