-- The link of a post (TASK-455 part C, ADR-0382, docs/DATABASE.md). A
-- migration already in main is never edited: write the next one.

-- «Links to my posts»: while true, a drawing of the account that every
-- member sees can be opened by its link on the site, without an account
-- (post_links.py). On from the start, for the accounts of before too: the
-- user's choice of 2026-11-12, told in the privacy text. Off, no link to the
-- account's drawings works, its owner's own included.
ALTER TABLE users ADD COLUMN post_links boolean NOT NULL DEFAULT true;
