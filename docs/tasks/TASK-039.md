# TASK-039 — Luna, gatto e pesce nel catalogo

**Stato**: Done
**Fase**: 3 · **Branch**: `feat/TASK-039-catalog-moon-cat-fish` (parte da
`main`, che contiene TASK-037)

## Obiettivo

Nell'app si possono scrivere «luna», «gatto» e «pesce» (e le parole
inglesi), e il percorso le disegna: le tre forme hanno un `sì` dell'utente
sulle strade di Trento o di Levico.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0036 (catalogo), ADR-0038, ADR-0039 (tratti)
- `docs/tasks/TASK-034.md` punto D; `samples/LOG.md`, righe di TASK-036 e
  TASK-037
- `docs/UI.md` «Forma e distanza»

## Cosa c'è già

- Catalogo: `circle`, `heart`, `star`, `horse`, nel motore, nell'API, in
  `shared-types` e in `contract.json`; le parole in `shapeWords.ts`.
- Giudizi dell'utente: luna `sì` a Levico 10 km (TASK-036) e a Milano;
  gatto e pesce, con i tratti, `sì` a Trento e Milano 15 km (TASK-037), non
  disponibili a Levico 15 km.

## Decisioni

- **A. Entrano luna, gatto e pesce**: scelto dall'utente il 2026-09-24. È
  la regola di TASK-034 (punto D): almeno un `sì` a Trento o a Levico.
- **B. Gatto e pesce entrano con i tratti** (occhi, occhio), i contorni
  giudicati `sì`. Dove le strade non li reggono il motore risponde «forma non
  disponibile», come già succede in Valsugana (ADR-0025).
- **C. Parole**: inglese e italiano, singolare e plurale, come le altre
  forme (ADR-0036); «mezzaluna», «micio», «pesciolino» compresi.

## Cosa fare

1. Motore: le tre forme in `SHAPES`; i test delle forme del catalogo
   tengono conto dei tratti (il ritorno ripassa sui punti dell'andata).
2. Contratto: `SHAPES` di `shared-types` e `contract.json`.
3. App: parole in `shapeWords.ts`, test delle parole e del messaggio.
4. Verifica: le tre forme chieste come `RouteRequest` danno gli stessi
   percorsi dei campioni giudicati.
5. Documentazione: `UI.md`, `ROUTE_ENGINE.md` §2, `ROADMAP.md`,
   `STATUS.md`. Corretta anche la riga di stato di ADR-0036 e ADR-0037,
   cambiata per errore in TASK-037.
6. Prova sull'iPhone (utente): «luna», «gatto», «pesce» a Trento.

## Criteri di accettazione

- [x] Dalla radice `npm run lint`, `npm run format:check`,
      `npm run typecheck` e `npm test` passano (169 test nell'app, 7 in
      `shared-types`); in `services/route-engine/` (271 test) e in
      `services/api/` (54) `ruff`, `black --check` e
      `pytest -m "not network"` passano.
- [x] Ogni forma del catalogo ha almeno una parola italiana e una inglese,
      e le nuove parole portano alla forma giusta (`shapeWords.test.ts`).
- [x] `plan_route` con `moon` a Levico 10 km, `cat` e `fish` a Trento
      15 km dà gli stessi punti dei campioni giudicati
      (`TASK-036_moon_10km_levico_v1.gpx`, `TASK-037_cat_15km_trento_v1.gpx`,
      `TASK-037_fish_15km_trento_v1.gpx`), in 6, 9 e 22 s.
- [x] Sull'iPhone «luna», «gatto» e «pesce» disegnano il percorso (prova
      dell'utente, 2026-09-24).
- [x] I job della CI sono verdi sulla PR (#43).
- [x] `UI.md`, `ROUTE_ENGINE.md`, `ROADMAP.md`, `STATUS.md` aggiornati.

## File toccati

```
services/route-engine/route_engine/shapes/__init__.py
services/route-engine/tests/test_shapes.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/contract.json
apps/mobile/src/route/shapeWords.ts
apps/mobile/src/route/shapeWords.test.ts
apps/mobile/__tests__/App.test.tsx
docs/UI.md
docs/ROUTE_ENGINE.md
docs/DECISIONS.md
docs/ROADMAP.md
docs/STATUS.md
docs/tasks/TASK-039.md
```

## Fuori scope

- Freccia, albero, corona e casa: restano forme da CLI.
- Rendere disegnabili gatto e pesce a Levico: TASK-038.
- Parole in altre lingue o frasi: TASK-030.

## Esito

Il catalogo ha sette forme: luna, gatto e pesce si scrivono nell'app e
disegnano il percorso, provato dall'utente sull'iPhone. Gatto e pesce, con
gli occhi, non sono disponibili a Levico 15 km: resta a TASK-038. Differenze
dal piano: nessuna.
