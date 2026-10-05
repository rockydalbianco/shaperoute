/**
 * Whether the app follows the phone's own units while none is chosen
 * (TASK-182, ADR-0149). Not yet, by the user's choice of 2026-10-05: until
 * «Draw», the run and the voice write miles too (part B), a phone in miles
 * starts in kilometres like every other, and «Settings» offers «Kilometres»
 * and «Miles» without «Phone units». Part B turns this on.
 */
export const FOLLOWS_PHONE: boolean = false;
