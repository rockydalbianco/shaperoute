-- Paddling joins the activities of the API (TASK-191 part B, ADR-0164,
-- docs/DATABASE.md). A migration already in main is never edited: write the
-- next one.

-- The check of 0008 lists the activities of the API (SUPPORTED_ACTIVITIES):
-- a route drawn on the water is kept as 'paddling', and reopens so. The
-- favorites kept before keep their activity.
ALTER TABLE favorites
    DROP CONSTRAINT favorites_activity_check,
    ADD CONSTRAINT favorites_activity_check
        CHECK (activity IN ('running', 'cycling', 'paddling'));
