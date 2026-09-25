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
4. I collegamenti (mappa, lettura) stanno in file di TASK-049:
   `mapPage.ts` e `messages.ts` (messaggi `loading`/`idle` dalla pagina),
   `MapView.tsx` (`onLoading`), `MapScreen.tsx` (barra sopra la mappa),
   `RoutePanel.tsx` (barra sotto «The AI is reading it…»). Chiesti al
   coordinatore il 2026-09-25.

## Criteri di accettazione

- [x] Stime per lettura e mappa: partono da 0, non superano il 95% (test).
- [x] Oltre il doppio del tempo tipico la barra dice «Still waiting»; col
      cambio di fase smette (test).
- [ ] La barra compare sopra la mappa finché le tessere non sono caricate.
- [ ] La barra compare sotto «The AI is reading it…».
- [ ] `typecheck`, `lint`, `format:check`, `npm test` puliti.
- [ ] Provato dall'utente sull'iPhone.

## File toccati

```
apps/mobile/src/route/progress.ts
apps/mobile/src/route/progress.test.ts
apps/mobile/src/route/LoadingBar.tsx
apps/mobile/src/route/LoadingBar.test.tsx
docs/tasks/TASK-058.md                       (nuovo)
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md
```

Da concordare con TASK-049 (collegamenti):

```
apps/mobile/src/map/mapPage.ts, map/messages.ts (+ test), map/MapView.tsx
apps/mobile/src/screens/MapScreen.tsx
apps/mobile/src/route/RoutePanel.tsx
```

## Fuori scope

- Un avanzamento vero dall'API o da MapLibre (percentuali reali).
- Un timeout più corto sulla prima chiamata all'API.

## Esito

*(in corso: barre e test pronti; mancano i collegamenti nei file di
TASK-049 e la prova sull'iPhone)*
