# TASK-085 — I luoghi suggeriti mentre si scrive la partenza

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-085-place-suggestions`

## Obiettivo

Scrivendo la città o la via da cui partire, i luoghi compaiono da soli
sotto il campo, senza premere «Search».

## Contesto da leggere

- `docs/UI.md` «Ricerca del luogo»
- `docs/DECISIONS.md` ADR-0029 (Photon)

## Cosa fare

1. In `PlaceSearch.tsx`: ricerca dopo una pausa nella scrittura, da 3
   lettere; «Search» resta.
2. Scartare le risposte a un testo che non è più nel campo.
3. Test con i timer finti; `UI.md`, ADR-0080.

## Criteri di accettazione

- [x] Scrivendo, una sola richiesta dopo la pausa, non una a lettera.
- [x] Una o due lettere non cercano e tolgono i suggerimenti.
- [x] «Search» non fa partire una seconda richiesta uguale.
- [x] Una risposta vecchia non copre quella nuova.
- [x] Prova sull'iPhone: scrivendo «via bel…» compaiono i luoghi.

## File toccati

```
apps/mobile/src/places/PlaceSearch.tsx
apps/mobile/src/places/PlaceSearch.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-085.md
```

## Fuori scope

- Suggerimenti ordinati per vicinanza alla posizione.
- Un altro servizio di ricerca.
- L'aspetto dei pulsanti: TASK-086.

## Esito

Fatto. Scrivendo la partenza i luoghi compaiono da soli, da 3 lettere e
dopo mezzo secondo di pausa; «Search» cerca subito. Provata dall'utente
sull'iPhone il 2026-09-30, dall'app pubblicata su Expo (`DEPLOY.md` A.6,
commit `2c209fb`): funziona. Il task è stato chiuso dalla sessione di
TASK-083, su richiesta dell'utente.
