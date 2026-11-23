-- The weeks of a plan of the gym (the guided plans, after TASK-411; docs/
-- DATABASE.md). A migration already in main is never edited: write the next
-- one.

-- A plan made with the guide is a program: its workouts of the week, each
-- on a day with its own exercises, a cycle of weeks that changes as the
-- owner chose (more load, more reps, two weeks in turn, or always the same),
-- the weeks written by hand, and the day it starts. Null for a plan of one
-- workout on its days, as before: `days` and `items` say it all. Checked by
-- gym_plans.py; only its owner reads it, and it goes with the account as the
-- plan does.
ALTER TABLE gym_plans
    ADD COLUMN program jsonb CHECK (program IS NULL OR jsonb_typeof(program) = 'object');
