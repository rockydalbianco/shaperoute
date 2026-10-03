-- The stretches of a bike route walked with the bike on foot, kept with the
-- favorites (TASK-206 part B, ADR-0167, docs/DATABASE.md). A migration
-- already in main is never edited: write the next one.

-- [[from, to], ...]: indices into the route's points, both included, of each
-- stretch walked with the bike on foot (RouteResult.on_foot). Empty for a
-- run, on the water, and for every row kept before: those read as they did.
ALTER TABLE favorites
    ADD COLUMN on_foot jsonb NOT NULL DEFAULT '[]'
        CHECK (jsonb_typeof(on_foot) = 'array');
