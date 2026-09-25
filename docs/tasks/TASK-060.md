# TASK-060 — `along` nell'API e nei tipi condivisi

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-060-along-api` (da `main` = `52ab8e3`)

## Obiettivo

La via lungo cui corre una strada senza nome, dedotta da TASK-053
(`sidewalks.alongs`, ADR-0054), arriva nella risposta dell'API e in
`packages/shared-types`, così TASK-061 può usarla nella navigazione.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0054 (la deduzione, tenuta a parte da `street`),
  ADR-0045 e ADR-0047 (indicazioni)
- `docs/tasks/TASK-053.md`, «Esito»
- `services/route-engine/route_engine/sidewalks.py`
- `services/api/shaperoute_api/jobs.py` (`with_directions`), `schemas.py`
- `docs/API.md`, indicazioni di svolta

## Cosa fare

1. Un campo `along` per indicazione, distinto da `street`: stringa o `null`,
   non `null` solo quando `street` è `null`.
2. L'API lo riempie dove calcola le indicazioni, con le vie del grafo e il
   file dei nomi della zona in cache; mai un download durante una richiesta,
   mai un percorso che fallisce per `along`.
3. `shared-types`: campo opzionale (un'API precedente non lo manda),
   fixture e test aggiornati.
4. ADR-0057, `docs/API.md`, `docs/STATUS.md`.

## Criteri di accettazione

- [x] `ruff`, `black`, `pytest -m "not network"` puliti in `services/api`
      e `services/route-engine`; `tsc` e `node --test` in `shared-types`.
- [x] Una risposta di `/route-jobs` porta `along` sulle indicazioni senza
      nome, e `street` resta `null` (test su un grafo costruito nel test).
- [x] Retrocompatibile: `along` opzionale in TypeScript, predefinito `null`
      nell'API; un file dei nomi illeggibile non fa fallire il percorso.
- [x] L'API non chiede mai i nomi a Overpass (test).
- [x] ADR-0057; `docs/API.md` e `docs/STATUS.md` aggiornati.

## File toccati

```
services/route-engine/route_engine/directions.py   (campo `along` di Direction)
services/route-engine/route_engine/network.py      (named_roads: download=False)
services/api/shaperoute_api/alongs.py              (nuovo)
services/api/shaperoute_api/jobs.py
services/api/shaperoute_api/graphs.py              (ZoneGraphs.named_roads)
services/api/shaperoute_api/schemas.py
services/api/tests/test_route_alongs.py            (nuovo)
packages/shared-types/src/index.ts
packages/shared-types/test/contract.test.ts
packages/shared-types/fixtures/route-result.json
packages/shared-types/fixtures/route-job-done.json
packages/shared-types/fixtures/gpx-request.json
docs/API.md, docs/DECISIONS.md, docs/STATUS.md, docs/tasks/TASK-060.md
```

## Fuori scope

- Mostrare o dire `along` nell'app: TASK-061 (ADR-0058).
- Scaricare il file dei nomi insieme a una zona nuova (ADR-0057,
  «Conseguenza»).
- `docs/MAPS.md`: il file dei nomi è già descritto da TASK-053.

## Esito

Fatto il 2026-09-25 (ADR-0057). Ogni indicazione ha `along`, `null` tranne
che sulle strade senza nome che corrono accanto a una via; lo riempie
`shaperoute_api/alongs.py` con le vie del grafo e il file dei nomi in cache
attorno al percorso (60 m). Cuore da 15 km di Trento dall'API: 118
indicazioni senza nome, 74 senza via col solo grafo, 57 col file dei nomi,
circa 0,3 s. Il file dei nomi c'è solo per Trento, Levico e Milano: una
zona nuova usa le sole vie del grafo. 8 test nuovi nell'API, 1 in
`shared-types`. `graphs.py` non era nell'elenco del coordinatore: serve
perché `ZoneGraphs` dia i nomi della cache.
