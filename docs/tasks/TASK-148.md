# TASK-148 — Togliere il vecchio «Ask for a route» da `ExploreTools.tsx`

**Stato**: Done
**Fase**: 4 · **Branch**: `chore/TASK-148-old-ask-for-route`

Assegnato dal coordinatore il 2026-10-02. È il «da fare dopo il merge di
TASK-142» scritto in `STATUS.md` alla voce di TASK-143: TASK-142 è in
`main`.

## Obiettivo

In `ExploreTools.tsx` resta solo `CityPicker`: «Ask for a route» vive in
`AskForRoute.tsx` (TASK-143), l'unico che `ExploreScreen.tsx` usa.

## Contesto da leggere

- `docs/STATUS.md`, «Completato», voce di TASK-143
- `apps/mobile/src/explore/AskForRoute.tsx` e il suo test

## Cosa fare

1. Controllare che nessuno importi più `AskForRoute` da `./ExploreTools`.
2. Togliere da `ExploreTools.tsx` la copia vecchia di `AskForRoute`, e con
   lei quello che usava solo lei: `AskProps`, `MAX_REQUEST_LENGTH` (c'è
   uguale in `AskForRoute.tsx`), gli import di `CATEGORIES`, `exampleFor`,
   `requestFor`, `whereFor` e gli stili della griglia delle categorie e del
   bottone «Make my route».
3. Togliere i suoi quattro test da `ExploreTools.test.tsx`.

## Criteri di accettazione

- [x] `grep AskForRoute` trova solo `AskForRoute.tsx`, il suo test ed
      `ExploreScreen.tsx`.
- [x] Nessuno stile, tipo o costante di `ExploreTools.tsx` resta senza uso.
- [x] I casi dei test tolti sono già coperti: categorie con la città e
      senza, dal punto di un luogo, la richiesta a parole in
      `AskForRoute.test.tsx`; l'esempio senza il nome del luogo in
      `presets.test.ts`.
- [x] Test, lint, tipi e formato dell'app verdi.

## File toccati

```
apps/mobile/src/explore/ExploreTools.tsx
apps/mobile/src/explore/ExploreTools.test.tsx
docs/STATUS.md
docs/tasks/TASK-148.md
```

## Fuori scope

- Il commento in `AskForRoute.tsx` che cita `ExploreTools.tsx` («dove
  "Ask for a route" era fino a TASK-143»): resta vero, e il file non è
  di questo task.
- Qualsiasi cambio a `CityPicker` o all'aspetto della schermata.
- Nessun ADR: è pulizia.

## Esito

Fatto: `ExploreTools.tsx` ha solo `CityPicker` (126 righe in meno), i test
di `ExploreTools.test.tsx` passano da 15 a 11. L'app non cambia: 603 test
verdi, lint, tipi e formato verdi. Niente `eas update`.
