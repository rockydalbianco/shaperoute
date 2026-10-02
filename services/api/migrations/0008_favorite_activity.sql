-- The activity a favorite was drawn for (TASK-200, ADR-0160,
-- docs/DATABASE.md). A migration already in main is never edited: write the
-- next one.

-- RouteRequest.activity of the route kept: a bike route reopens as a bike
-- route. Every row kept before was a run's: those take 'running'. The
-- activities are the API's (SUPPORTED_ACTIVITIES): one it adds needs a
-- migration that widens this check, and test_favorites.py fails until then.
ALTER TABLE favorites
    ADD COLUMN activity text NOT NULL DEFAULT 'running'
        CHECK (activity IN ('running', 'cycling'));
