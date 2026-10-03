# TASK-224 — Correndo: il fatto giallo, il da fare tratteggiato che lampeggia

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-224-route-done-ahead`

## Obiettivo

Mentre si corre un percorso, sulla mappa la parte già corsa resta gialla
piena e quella ancora da fare è gialla, tratteggiata e lampeggia. Chiesto
dall'utente il 2026-10-03: «voglio che il segno del percorso fatto sia
giallo mentre quello da fare sia tratteggiato che lampeggia come se dovessi
ancora farlo». Stile approvato dall'utente su un'anteprima («Sì, così»).

## Contesto da leggere

- `docs/UI.md`, «La navigazione» e «La freccia di direzione»
- `docs/DECISIONS.md` ADR-0157/TASK-198 (penna alzata), ADR-0167 (bici a
  mano), ADR-0066 (Pocket)
- `apps/mobile/src/map/` (la pagina MapLibre nella WebView, ADR-0029)

## Cosa fare

1. `src/map/routeSplit.ts` (nuovo): il percorso tagliato ai metri del
   navigatore, a passi di 5 m; con la penna alzata solo le lettere; dopo
   l'arrivo tutto fatto.
2. `messages.ts`: `showProgress` (fatto, da fare, lampeggio) e
   `clearProgress`.
3. `mapPage.ts`: uno strato `route-ahead` sotto il percorso, giallo e
   tratteggiato, che lampeggia a scatti senza dissolvenza; fermo con
   `blink: false` e con «Riduci movimento»; il percorso di `showRoute` resta
   e torna intero con `clearProgress`.
4. `MapView.tsx`: la prop `progress` manda il taglio; `App.tsx` gliela passa
   mentre si naviga.
5. «Pocket»: `src/navigation/pocketOn.ts` (nuovo), scritto da
   `usePocketMode`, letto dalla mappa.
6. Il token `routeAhead`; test; `UI.md`, ADR, `STATUS.md`.

## Criteri di accettazione

- [x] Correndo un percorso la parte corsa è la linea gialla piena, quella
      da fare è gialla tratteggiata e lampeggia (0,7 s accesa, 0,7 s a
      opacità 0,3), a scatti (`line-opacity-transition` a zero).
- [x] Prima del primo passo tutto è da fare; dopo «You have arrived» tutto
      è fatto; a fine corsa il percorso torna intero e non lampeggia più.
- [x] Con «Pocket» il tratteggio resta fermo e acceso, e riprende a
      lampeggiare all'uscita; con «Riduci movimento» non lampeggia mai.
- [x] Con la penna alzata si tagliano solo le lettere; i tratti a piedi
      restano come prima. Con la bici a mano i trattini scuri restano sopra.
- [x] La mappa riceve il taglio a passi di 5 m, non a ogni posizione.
- [x] Fuori dalla corsa (scelta, «Explore», fine corsa) la mappa è come
      prima.
- [x] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## File toccati

```
apps/mobile/App.tsx (solo la prop `progress` di <MapView>)
apps/mobile/src/map/MapView.tsx
apps/mobile/src/map/MapView.test.tsx
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/mapPageProgress.test.ts (nuovo)
apps/mobile/src/map/messages.ts
apps/mobile/src/map/messages.test.ts
apps/mobile/src/map/routeSplit.ts (nuovo)
apps/mobile/src/map/routeSplit.test.ts (nuovo)
apps/mobile/src/navigation/pocketOn.ts (nuovo)
apps/mobile/src/navigation/usePocketMode.ts
apps/mobile/src/theme/tokens.ts
docs/tasks/TASK-224.md (nuovo)
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
```

## Fuori scope

- Fermare il lampeggio sulla pagina «Data», dove la mappa è coperta: la
  mappa là continua anche a seguire chi corre; da chiedere se serve.
- La linea corsa davvero (la traccia GPS) durante la corsa: resta solo a
  fine corsa (TASK-113).
- Pubblicare su `preview`: con l'ok dell'utente, dal coordinatore.

## Esito

*(a fine task)*
