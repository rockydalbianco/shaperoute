/**
 * Whether «Feed» shows the routes MuW drew (TASK-365, ADR-0310). Off since
 * the user's choice of 2026-11-10 (TASK-430, ADR-0358): the Feed shows only
 * people's posts. The API, catalog/muw_routes/ and the cards stay, so the
 * routes come back by setting this to true.
 */
export const MUW_ROUTES_IN_FEED: boolean = false;
