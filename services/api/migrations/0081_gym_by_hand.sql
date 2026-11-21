-- A workout at the gym written by hand (TASK-484, ADR-0395,
-- docs/sports/gym.md, docs/DATABASE.md): done before, typed in from the
-- «+» of the Feed, saved by PUT /me/gym-sessions/{key} with `manual`. It
-- counts for the Feed, «My activities» and the calendar, never for the
-- game, the contest, the badges, the leaderboard or the levels of the gym,
-- which read `muw` only. The app says it, as it says `file`: not a proof.
-- A migration already in main is never edited: write the next one.

ALTER TABLE runs DROP CONSTRAINT runs_source_check;
ALTER TABLE runs
    ADD CONSTRAINT runs_source_check CHECK (source IN ('muw', 'file', 'manual'));
