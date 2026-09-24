# TASK-055 — Barra di caricamento sotto la mappa

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-055-loading-bar`

## Obiettivo

Mentre il percorso si disegna, sotto la mappa una barra che avanza, al
posto della rotellina di TASK-054.

## Richiesta dell'utente (2026-09-24, dopo TASK-054)

«Serve anche la barra di caricamento durante il disegno sotto la mappa.»

## Contesto da leggere

- `docs/UI.md` («Chiedere un percorso»), `docs/API.md` («Tempi»)
- `apps/mobile/src/route/RoutePanel.tsx` (`RouteOutcome`),
  `useRouteRequest.ts` (le fasi)

## Cosa fare

Decisioni dell'agente su delega dell'utente (ADR-0050):

1. L'API dice la fase (in coda, download della zona, calcolo), mai una
   percentuale: la barra è una **stima**. Ogni fase ha un tratto della
   barra (0–8%, 8–45%, 45–95%) e lo percorre al ritmo dei tempi misurati,
   rallentando verso la fine senza mai superarlo. Il calcolo si aspetta
   2,5 s a km, non meno di 10 s; il download 90 s.
2. La barra non torna mai indietro, e si riempie solo quando arriva il
   percorso, che la sostituisce.
3. Gialla: è il percorso che prende forma (ADR-0046). Senza librerie nuove.

## Criteri di accettazione

- [ ] La stima parte dall'inizio della fase, non ne supera la fine, avanza
      sempre, e dà più tempo ai percorsi lunghi (test).
- [ ] La barra avanza col tempo e non torna indietro al cambio di fase
      (test).
- [ ] Nell'attesa la scheda mostra frase, «Cancel» e barra (test dell'app).
- [ ] `typecheck`, `lint`, `format:check`, `npm test` puliti.
- [ ] Provato dall'utente sull'iPhone.

## File toccati

```
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/progress.ts          (nuovo)
apps/mobile/src/route/progress.test.ts     (nuovo)
apps/mobile/src/route/LoadingBar.tsx       (nuovo)
apps/mobile/src/route/LoadingBar.test.tsx  (nuovo)
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md
```

## Fuori scope

- Un avanzamento vero, dall'API: il motore dovrebbe dire a che punto è la
  ricerca. Tocca motore, API e contratto.

## Esito

*(in attesa della prova sull'iPhone)*

251 test verdi; nuovi `progress.test.ts` e `LoadingBar.test.tsx`. Il test
dell'app sull'attesa trova la barra (`testID` «loading») come trovava la
rotellina, e non è cambiato.
