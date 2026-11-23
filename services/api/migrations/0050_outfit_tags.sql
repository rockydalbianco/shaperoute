-- The items a member tags on the photos of its own posts (TASK-394,
-- ADR-0333, docs/DATABASE.md): what it wears, the brand, the model and a
-- shop's link if it likes; opened and «Shop» counted per day. Apart from
-- MuW Style's tables (0046): a post of MuW and one of a member have other
-- rules. A migration already in main is never edited: write the next one.

-- One item on a photo of a drawing: where it is (0–1 from the top left),
-- what, and the link as outfit_links.py cleaned it, with the store «Shop on»
-- names. It follows its photo: a new order of the photos leaves it, and a
-- photo removed takes it along, so does a drawing back to «Only me», whose
-- photos leave the server (ADR-0170). Hidden from a report's email, only
-- its owner sees it.
CREATE TABLE drawing_outfit_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id uuid NOT NULL,
    n smallint NOT NULL,
    -- In the order the owner sent them, 0 first.
    position smallint NOT NULL CHECK (position BETWEEN 0 AND 4),
    x double precision NOT NULL CHECK (x >= 0 AND x <= 1),
    y double precision NOT NULL CHECK (y >= 0 AND y <= 1),
    item text NOT NULL CHECK (item IN ('shoes', 'top', 'jacket', 'shorts',
        'tights', 'socks', 'cap', 'glasses', 'watch', 'backpack', 'other')),
    brand text NOT NULL CHECK (length(brand) BETWEEN 1 AND 40),
    product_name text CHECK (length(product_name) BETWEEN 1 AND 80),
    url text CHECK (url ~ '^https://' AND length(url) <= 1000),
    store text CHECK (length(store) BETWEEN 1 AND 253),
    hidden_at timestamptz,
    created_at timestamptz NOT NULL,
    CHECK ((url IS NULL) = (store IS NULL)),
    FOREIGN KEY (drawing_id, n) REFERENCES drawing_photos (drawing_id, n)
        ON DELETE CASCADE
);
CREATE INDEX drawing_outfit_tags_photo
    ON drawing_outfit_tags (drawing_id, n, position);

-- A photo replaced in its place is another photo: its items go. The same
-- photo sent again (the phone's outbox retries) keeps them: only a JPEG
-- that changed counts. A trigger, so drawing_photos.py does not change.
CREATE FUNCTION drawing_photo_replaced() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM drawing_outfit_tags
        WHERE drawing_id = OLD.drawing_id AND n = OLD.n;
    RETURN NEW;
END;
$$;
CREATE TRIGGER drawing_photo_replaced
    AFTER UPDATE OF jpeg ON drawing_photos
    FOR EACH ROW WHEN (OLD.jpeg IS DISTINCT FROM NEW.jpeg)
    EXECUTE FUNCTION drawing_photo_replaced();

-- How many times an item was opened and «Shop» touched, per day. Nothing
-- of who: no account, no address, no phone (ADR-0333). Only the owner of
-- the item reads the totals.
CREATE TABLE outfit_tag_clicks (
    tag_id uuid NOT NULL REFERENCES drawing_outfit_tags (id) ON DELETE CASCADE,
    day date NOT NULL,
    opens integer NOT NULL DEFAULT 0 CHECK (opens >= 0),
    shops integer NOT NULL DEFAULT 0 CHECK (shops >= 0),
    PRIMARY KEY (tag_id, day)
);

-- MuW's own list of domains no item may link to, nor any host under them:
-- what Web Risk does not know (adult sites, spam), added by hand after a
-- report (docs/API.md, «Outfit tags»). Checked when a link is kept and at
-- every «Shop».
CREATE TABLE outfit_blocked_domains (
    domain text PRIMARY KEY
        CHECK (domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$' AND length(domain) <= 253),
    note text CHECK (length(note) <= 200),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- An item is reported too (moderation.py): the list of kinds of
-- 0033_messages.sql, with 'outfit_tag'.
ALTER TABLE reports DROP CONSTRAINT reports_kind_check;
ALTER TABLE reports ADD CONSTRAINT reports_kind_check
    CHECK (kind IN ('drawing', 'comment', 'user', 'group_run', 'message',
        'outfit_tag'));
