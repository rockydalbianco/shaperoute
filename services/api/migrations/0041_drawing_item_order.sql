-- TASK-348, ADR-0301: a post of up to 10 photos, in an order its owner can
-- rewrite. A place keeps its number when the order changes: `n` says which
-- photo, `item_order` where it stands, with the map among them ("drawing",
-- "photo:2"). NULL: never ordered, the map first and the photos by place.
ALTER TABLE drawing_photos DROP CONSTRAINT drawing_photos_n_check;
ALTER TABLE drawing_photos ADD CONSTRAINT drawing_photos_n_check
    CHECK (n BETWEEN 1 AND 10);

ALTER TABLE drawings ADD COLUMN item_order text[];
