-- A gym plan as a post (TASK-485 part A, ADR-0394, docs/DATABASE.md): a
-- drawing without a run, as a post of photos only (0080), that carries a
-- copy of the plan as it was when it was posted. A migration already in
-- main is never edited: write the next one.

-- The plan the post shows: its name, days, exercises with their kg and its
-- weeks, checked by plan_posts.py; never its owner's first day, paces or
-- date of the target. A copy, not a reference to gym_plans: changing or
-- deleting the plan leaves the post as it was. Only a drawing without a
-- run, and not the post of a night, has one; it is published as it is
-- made, it waits for no photo.
ALTER TABLE drawings
    ADD COLUMN plan jsonb,
    ADD CONSTRAINT drawings_plan_post_check
        CHECK (
            plan IS NULL
            OR (
                run_id IS NULL
                AND sleep_night_id IS NULL
                AND published_at IS NOT NULL
                AND jsonb_typeof(plan) = 'object'
            )
        );
