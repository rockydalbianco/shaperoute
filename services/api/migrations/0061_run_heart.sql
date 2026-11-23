-- The heart rate of a run (TASK-409 part B, ADR-0334 precisazione D,
-- docs/DATABASE.md): its average and its maximum, in beats a minute, read
-- on the phone from what a watch wrote in Apple Health during the run, and
-- whether others see them (TASK-345 B). Today only a swim in a pool writes
-- them (pool_swims.py); every other run keeps them null. A migration already
-- in main is never edited: write the next one.
ALTER TABLE runs
    ADD COLUMN heart_avg_bpm smallint,
    ADD COLUMN heart_max_bpm smallint,
    ADD COLUMN heart_shown boolean NOT NULL DEFAULT true,
    ADD CONSTRAINT runs_heart_check CHECK (
        (heart_avg_bpm IS NULL) = (heart_max_bpm IS NULL)
        AND (
            heart_avg_bpm IS NULL
            OR (
                heart_avg_bpm BETWEEN 30 AND 230
                AND heart_max_bpm BETWEEN 30 AND 230
                AND heart_avg_bpm <= heart_max_bpm
            )
        )
    );
