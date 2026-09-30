# TASK-085 — I luoghi suggeriti mentre si scrive la partenza

**Stato**: In corso — codice e test fatti, manca la prova sull'iPhone
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
- [x] Con la posizione nota, Photon riceve `lat`/`lon` (dopo la prima
      prova: «via bel» dava il Brasile).
- [ ] Prova sull'iPhone: scrivendo «via bel…» compaiono i luoghi.

## File toccati

```
apps/mobile/src/places/PlaceSearch.tsx
apps/mobile/src/places/PlaceSearch.test.tsx
apps/mobile/src/places/photon.ts
apps/mobile/src/places/photon.test.ts
apps/mobile/src/screens/ChooseScreen.tsx
apps/mobile/App.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-085.md
```

## Fuori scope

- Un altro servizio di ricerca.
- L'aspetto dei pulsanti: TASK-086.

## Esito

*(a fine task)*
