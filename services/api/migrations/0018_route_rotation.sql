-- How far the shape of a saved route is turned (TASK-232 part C, ADR-0195,
-- docs/DATABASE.md): the engine may turn a shape up to 45° to follow the
-- roads, and says by how much (RouteResult.rotation_deg, degrees
-- counterclockwise); the app turns the map the other way so the drawing
-- reads upright, and wants the same turn on a run saved, a favorite kept
-- and a drawing seen. A migration already in main is never edited: write
-- the next one.

-- The planned route's turn, when the app said one. Absent for a run
-- without a route, for a route the app sent north up and for every run
-- saved before: those are shown north up, as they were.
ALTER TABLE runs
    ADD COLUMN route_rotation_deg real
        CHECK (route_rotation_deg BETWEEN -180 AND 180),
    ADD CHECK (route IS NOT NULL OR route_rotation_deg IS NULL);

-- The same for a favorite: the route's turn, when the app said one.
ALTER TABLE favorites
    ADD COLUMN rotation_deg real CHECK (rotation_deg BETWEEN -180 AND 180);
