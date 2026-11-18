# TASK-478 — La mappa a fine attività: inquadrata e visibile

**Stato**: In lavorazione · 2026-11-18 · assegnato dal Coordinatore. ADR
solo se serve (numero riservato: ADR-0388).

Trovato nel simulatore il 2026-11-18, provando TASK-305 R6c (la mappa a
due colori di una gara). Il lavoro ha due parti.

## (a) La mappa inquadrata sulla traccia — difetto

**Il difetto**: a fine attività senza percorso la mappa resta sulla
partenza e la traccia esce dallo schermo. `showTrack` disegna la linea ma
non chiama `frame`; la inquadra solo un percorso (`showRoute`).

**La correzione**:
- `showTrack` e `showLifts` portano `frame: true`. La mappa mette allora
  tutte le linee in `framed` e chiama `frame()`, come per un percorso.
- `MapView` lo manda quando c'è una traccia, nessun percorso e nessuno da
  seguire: la fine di una corsa senza percorso, e la pagina riaperta senza
  percorso.
- Mentre si registra mai: la traccia arriva senza `frame` e la mappa segue
  chi corre, come prima.

File: `apps/mobile/src/map/messages.ts`, `apps/mobile/src/map/mapPage.ts`,
`apps/mobile/src/map/MapView.tsx`,
`apps/mobile/src/map/mapPageFrameTrack.test.ts` (nuovo),
`apps/mobile/src/map/MapViewFrameTrack.test.tsx` (nuovo),
`apps/mobile/src/map/MapViewLifts.test.tsx` (due attese con `frame: true`),
`docs/UI.md`, `docs/tasks/TASK-478.md`.

## (b) La mappa coperta da scheda e modulo — scelta dell'utente

Con un account, a fine attività la scheda con i numeri e il modulo del post
coprono quasi tutta la mappa. **Scelta dell'utente (2026-11-18)**: «Scheda
che si piega».
- Come la scheda dei numeri durante la corsa (TASK-472), un tocco o un
  trascinamento in giù la piega in una striscia «▲ km · tempo [Save]».
- Un altro tocco la riapre.

Lista dei file mandata al Coordinatore. Si fa dopo (a).

**Fatto (PR di (b))**: la maniglia di TASK-472 in cima alla scheda di fine
(`MapScreen`, prop `endStrip`), la striscia in `EndFoldedStrip.tsx`. Da
piegata la scheda resta montata ma nascosta, così il modulo tiene le sue
scelte. Il «Save» della striscia chiama il `save()` di `RunEnd` attraverso
un prop nuovo, `saveRef`: `RunEnd.tsx` non era nella lista, OK del
Coordinatore del 2026-11-18. Chiamare `onSaveRun` direttamente avrebbe
saltato visibilità, foto, salute e Strava.

## Criteri di accettazione

- [ ] (a) A fine corsa senza percorso, la traccia intera nella mappa
      (schermata prima/dopo nel simulatore).
- [x] (a) Mentre si registra la mappa non si inquadra mai da sola (test).
- [ ] (b) La scheda di fine si piega e si riapre; «Save» dalla striscia.
