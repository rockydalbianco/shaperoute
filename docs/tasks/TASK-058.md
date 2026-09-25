# TASK-058 — La barra di caricamento anche per la mappa e per l'API

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-058-loading-everywhere`

## Obiettivo

La barra di TASK-055 (ADR-0050) anche nelle altre attese che l'utente vede:
la mappa che si carica e l'API che non risponde.

## Richiesta dell'utente (2026-09-24)

«La barra del caricamento va messa anche quando sta facendo il download
della mappa e connessione API.»

Domanda all'utente (2026-09-25): durante il disegno la barra copriva già
l'attesa della risposta e il download della zona; mancava altrove. Risposta:
**tutti e tre** i punti proposti:

1. la mappa (MapLibre e le tessere) che si carica nella WebView;
2. l'AI che legge le parole («The AI is reading it…»);
3. l'API che non risponde: la barra si fermava vicino all'8%.

## Contesto da leggere

- `docs/UI.md` («Chiedere un percorso», «Quando la mappa non si carica»)
- `docs/tasks/TASK-055.md`, ADR-0050
- `apps/mobile/src/route/progress.ts`, `LoadingBar.tsx`

## Cosa fare

Decisioni dell'agente su delega dell'utente (ADR-0055):

1. Una sola barra (`EstimateBar` in `LoadingBar.tsx`), usata tre volte:
   `LoadingBar` (percorso, come prima), `ReadingBar`, `MapLoadingBar`.
   Stessa regola: stima dal tempo, mai indietro, mai piena da sola.
2. Lettura dell'AI: tempo tipico 20 s (4–10 s col modello caricato,
   39–49 s da caricare, `AI.md`). Mappa: 5 s.
3. Oltre il doppio del tempo tipico di una fase la barra **pulsa** e dice
   «Still waiting» allo screen reader: un'API che non risponde non sembra
   bloccata. Con la risposta la pulsazione smette.
4. La barra della mappa sta in `MapView` (nessun cambio a `App.tsx` né a
   `MapScreen.tsx`), al centro della mappa ancora vuota: lontana dalla
   freccia indietro e dall'attribuzione. Solo il **primo** caricamento:
   dalla pagina che parte al primo `idle` di MapLibre (messaggio `loaded`);
   non a ogni spostamento, che in navigazione la farebbe comparire sempre.
   Un errore della mappa la toglie e mostra l'errore.
5. La barra della lettura sta sotto «The AI is reading it…» in
   `RoutePanel.tsx`. File liberati da TASK-049 il 2026-09-25 (merge #65).

## Criteri di accettazione

- [x] Stime per lettura e mappa: partono da 0, non superano il 95% (test).
- [x] Oltre il doppio del tempo tipico la barra dice «Still waiting»; col
      cambio di fase smette (test).
- [x] La barra compare sulla mappa finché le prime tessere non sono
      disegnate; un errore la toglie (test).
- [x] La barra compare sotto «The AI is reading it…» (test).
- [x] `typecheck`, `lint`, `format:check`, `npm test` puliti (275 test).
- [ ] Provato dall'utente sull'iPhone.

## File toccati

```
apps/mobile/src/route/progress.ts
apps/mobile/src/route/progress.test.ts
apps/mobile/src/route/LoadingBar.tsx
apps/mobile/src/route/LoadingBar.test.tsx
docs/tasks/TASK-058.md                       (nuovo)
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/mapPage.test.ts
apps/mobile/src/map/messages.ts
apps/mobile/src/map/messages.test.ts
apps/mobile/src/map/MapView.tsx
apps/mobile/src/map/MapView.test.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanel.test.tsx    (nuovo)
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md
```

`MapScreen.tsx` non è servito.

## Fuori scope

- Un avanzamento vero dall'API o da MapLibre (percentuali reali).
- Un timeout più corto sulla prima chiamata all'API.

## Esito

*(in attesa della prova sull'iPhone)*
