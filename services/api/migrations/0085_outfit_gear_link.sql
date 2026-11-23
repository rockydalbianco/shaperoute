-- An item tagged on a photo can be one of its owner's gear (TASK-486 part
-- F, ADR-0393, the user's choice 3): picked «From my gear», its kind, brand
-- and model come from there and the dot opens the item. The tag keeps its
-- own words, so an item of gear deleted leaves the tag as it was, without
-- the link (ON DELETE SET NULL). A migration already in main is never
-- edited: write the next one.
ALTER TABLE drawing_outfit_tags
    ADD COLUMN gear_id uuid REFERENCES gear (id) ON DELETE SET NULL;
CREATE INDEX drawing_outfit_tags_gear ON drawing_outfit_tags (gear_id)
    WHERE gear_id IS NOT NULL;
