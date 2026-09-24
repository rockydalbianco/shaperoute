# TASK-036 — Forme dritte

**Stato**: Done
**Fase**: 3 · **Branch**: `feat/TASK-036-upright-shapes` (parte da
`feat/TASK-035-similarity-details`)

## Obiettivo

Le forme che hanno un alto e un basso (cuore, stella, cavallo, casa, e le
candidate) restano dritte sulla mappa, inclinate al massimo di pochi gradi.
TASK-035 ha mostrato che l'occhio non riconosce una forma inclinata.

## Contesto da leggere

- `docs/tasks/TASK-035.md` «L'orientamento»; `docs/DECISIONS.md` ADR-0023,
  ADR-0037
- `docs/ROUTE_ENGINE.md` §5 (ricerca)
- `services/route-engine/route_engine/optimizer.py` (`search`,
  `best_placement`, la rifinitura della rotazione)

## Cosa c'è già

- La ricerca prova 24 rotazioni, ogni 15° su tutto il giro, e poi rifinisce
  di ±15° attorno alla migliore.
- Nei 72 casi giudicati, senza cerchio e casa, 25 `sì` su 26 sono dritti, e
  8 dei 10 casi inclinati di 15° o più sono `no`.

## Decisioni

Prese dall'agente il 2026-09-24, su delega dell'utente.

- **A. Inclinazione massima 15°** per tutte le forme, rotazioni provate
  -15°, 0°, +15°, e la rifinitura resta dentro lo stesso limite. Tutti i
  `sì` stavano entro 5°: 15° lascia un po' di margine alle strade.
- **B. Il cerchio gira libero** (`FREE_ROTATION`): a qualsiasi angolo è lo
  stesso cerchio, e la rotazione attorno alla partenza lo sposta dove le
  strade lo reggono.
- **C. Anche i contorni da file restano dritti**, dalla CLI come nel
  catalogo.
- **D. Nessun altro parametro cambia.** Fasi, partenze e scale restano: con
  meno rotazioni la ricerca ha meno posizioni, e i campioni dicono se basta.
- **E. Si rigenerano tutti i casi giudicati** (tranne il cerchio e la casa
  v1, sostituita): quelli che non cambiano tengono il giudizio, quelli che
  cambiano diventano campioni `TASK-036_*` da giudicare.

## Cosa fare

1. Motore: il limite nella ricerca, il cerchio libero, la CLI.
2. Test: una ricerca con il limite non supera mai i 15°; il cerchio è
   libero e le altre forme del catalogo no; `plan_route` tiene dritta una
   forma del catalogo.
3. Campioni dei casi cambiati, giudizio dell'utente in `samples/LOG.md`.
4. Documentazione: `ROUTE_ENGINE.md` §5, nuova ADR, `ROADMAP.md`,
   `STATUS.md`.

## Criteri di accettazione

- [x] In `services/route-engine/` (204 test) e in `services/api/` (54)
      `ruff`, `black --check` e `pytest -m "not network"` passano.
- [x] Ogni caso del punto 2 ha il suo test (`test_optimizer.py`).
- [x] I casi giudicati sono rigenerati (60: 45 uguali, 15 cambiati,
      nessuno rifiutato); i 15 cambiati hanno un campione e il giudizio
      dell'utente in `LOG.md`.
- [x] Nessuna forma del catalogo peggiora a giudizio dell'utente: cuore di
      Levico da `quasi` a `sì`, cuore di Trento e stella di Levico `sì`.
- [ ] I job della CI sono verdi sulla PR.
- [x] ADR-0038; `ROUTE_ENGINE.md`, `ROADMAP.md`, `STATUS.md` aggiornati.

## File toccati

```
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/shapes/__init__.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/test_optimizer.py
samples/TASK-036_*.gpx
samples/LOG.md
docs/ROUTE_ENGINE.md
docs/DECISIONS.md
docs/ROADMAP.md
docs/STATUS.md
docs/tasks/TASK-036.md
```

## Fuori scope

- Tratti interni ripassati (TASK-037) e scelta del posto (TASK-038).
- Più fasi o più partenze per compensare le rotazioni perse: solo se i
  campioni lo chiedono.

## Esito

Giudicato dall'utente il 2026-09-24 (`out/TASK-036-before-after.png`,
`samples/LOG.md`): dei 15 casi che cambiano, 7 migliorano e nessuno
peggiora. Le forme ora restano dritte, e l'occhio le riconosce di più: il
cuore di Levico e la luna di Levico diventano `sì`, pesce, freccia, albero
e gatto passano da `no` a `quasi`. La luna può entrare nel catalogo. Le
forme ancora a `no` si riconoscono da un dettaglio interno: per l'utente
servono i tratti interni ripassati (TASK-037).
