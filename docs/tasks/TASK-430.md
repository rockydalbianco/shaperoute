# TASK-430 — Niente percorsi di MuW nel Feed

**Stato**: In lavorazione · **Fase**: 5 · **Branch**:
`feat/TASK-430-no-muw-routes-in-feed` · **ADR**: ADR-0358 · numeri dal
Coordinatore il 2026-11-10

## Obiettivo

Nel Feed non compaiono più i 25 percorsi creati da MuW (TASK-365, ADR-0310),
come «Yellow Arrow · Valencia». Richiesta dell'utente del 2026-11-10: «togli
tutti i percorsi fatti da MuW, ad esempio Yellow Arrow Valencia, per
cortesia»; alla domanda su dove, «Solo il Feed». La fila «RIDE IT YOURSELF»
in «Explore» (Ghost, Bat, Pumpkin, TASK-364) resta.

## Cosa si fa

- `apps/mobile/src/feed/muwInFeed.ts` (nuovo): `MUW_ROUTES_IN_FEED = false`.
- `FeedScreen.tsx`: con l'interruttore spento non chiede `GET /muw-routes` e
  non mescola schede MuW nel Feed, con o senza account.
- Restano l'endpoint, `catalog/muw_routes/`, le schede e il codice: per
  riaccenderli basta mettere `true`.
- Test: `FeedScreenNoMuw.test.tsx` (nuovo) prova che non ci sono e che non
  vengono chiesti; `FeedScreenMuw.test.tsx` accende l'interruttore e prova
  il comportamento di prima.

## Criteri di accettazione

- [x] Nel Feed («All», con e senza account) nessuna scheda MuW, anche se
      l'API le ha.
- [x] L'app non chiama `GET /muw-routes`.
- [x] Test dei file toccati e `tsc` verdi.
- [ ] Merge col via del Coordinatore; OTA di produzione solo col sì
      dell'utente.

## File toccati

```
apps/mobile/src/feed/muwInFeed.ts                (nuovo)
apps/mobile/src/screens/FeedScreen.tsx
apps/mobile/src/screens/FeedScreenMuw.test.tsx
apps/mobile/src/screens/FeedScreenNoMuw.test.tsx (nuovo)
docs/tasks/TASK-430.md                           (nuovo)
```

Le righe di `STATUS.md`, `DECISIONS.md` (ADR-0358) e `INDEX.md` vanno in
una PR di soli documenti dopo il merge del codice.
