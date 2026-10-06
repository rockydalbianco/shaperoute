-- The post of a run, as its owner shared it (TASK-258, ADR-0222,
-- docs/DATABASE.md): the emoji with their places on the picture, the
-- results shown and the title at the time, enough to make the same post
-- again. Never the picture: it is made from these and the run. A migration
-- already in main is never edited: write the next one.

-- One document, written whole each time the post is shared; absent for a
-- run whose post was never shared, and for every run saved before. Not
-- searched: no index.
ALTER TABLE runs
    ADD COLUMN post jsonb;
