-- The walks of a word with the pen up, kept with the runs and the favorites
-- that follow one (TASK-199, ADR-0157, docs/DATABASE.md). A migration already
-- in main is never edited: write the next one.

-- [[from, to], ...]: indices into the route's points, both included, of each
-- stretch walked from one letter to the next without drawing (RouteResult.
-- walks). Empty for any other route, and for every row kept before: those
-- read as they did.
ALTER TABLE runs
    ADD COLUMN walks jsonb NOT NULL DEFAULT '[]'
        CHECK (jsonb_typeof(walks) = 'array'),
    -- Walks are stretches of a route: a run without one has none.
    ADD CHECK (route IS NOT NULL OR walks = '[]');

ALTER TABLE favorites
    ADD COLUMN walks jsonb NOT NULL DEFAULT '[]'
        CHECK (jsonb_typeof(walks) = 'array');
