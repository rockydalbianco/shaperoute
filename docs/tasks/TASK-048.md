# TASK-048 — Indicazioni di svolta nell'API

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-048-directions-api` (da `main`, dopo il
merge di TASK-047, PR #53)

## Obiettivo

La risposta di un percorso porta anche le sue indicazioni di svolta, fino a
`shared-types`: chi le mostrerà (app, voce) le trova già pronte e leggibili.
Nessuna schermata qui.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0045 (le indicazioni), ADR-0032 (richieste in due
  tempi)
- `services/route-engine/route_engine/directions.py`
- `services/api/shaperoute_api/jobs.py` (`_run`, `_Reporting`),
  `schemas.py` (`RouteResultBody`)
- `packages/shared-types/src/index.ts` (`RouteResult`)
- `docs/tasks/TASK-047.md`, «Esito»

## Cosa c'è già

`directions(graph, nodes)` nel motore (TASK-047). I nodi del percorso sono
in `Plan.search.best.route.nodes`, e `jobs.py` riceve il `Plan` intero:
**non serve toccare `optimizer.py`**. Il grafo su cui il percorso è stato
tracciato è quello che il loader ha dato al motore: `_Reporting` lo vede
passare (con la ricerca lontana, ADR-0040, è il secondo).

## Cosa fare

1. **Nel motore**, in `directions.py`:
   - la **via di partenza** come prima indicazione (verso `depart`, alla
     distanza 0), perché «gira a destra» non si capisce senza sapere dove
     si parte;
   - le **indicazioni a meno di 15 m l'una dall'altra raggruppate in una**,
     come «sinistra, poi subito destra» quando si attraversa una strada
     (a Milano 110 su 264, TASK-047). La prima porta le altre (`then`), e
     nessuna si perde: resta vero che ogni incrocio ha la sua.
   La soglia di 15 m è un punto di partenza: si misura sui cuori di
   Trento, Levico e Milano e si scrive nell'ADR.
2. **Nell'API**, in `jobs.py` e `schemas.py`: `RouteResultBody.directions`,
   una lista, vuota quando il percorso non ha nodi (senza ottimizzazione).
   Campo nuovo e facoltativo: chi legge la risposta di oggi non si rompe.
3. **In `shared-types`**: `Direction` e `RouteResult.directions`, con le
   fixture JSON del contratto.
4. Test deterministici: motore (raggruppamento e partenza sul grafo di
   TASK-047), API con un planner finto, contratto.

## Criteri di accettazione

- [ ] `ruff`, `black`, `pytest -m "not network"` e i test di
      `shared-types` puliti.
- [ ] Una richiesta in due tempi restituisce le indicazioni, con la via di
      partenza come prima.
- [ ] Nessuna indicazione persa nel raggruppamento (test).
- [ ] Sui tre cuori da 15 km, il numero di indicazioni dopo il
      raggruppamento è scritto nell'esito.
- [ ] Nessun file fuori da «File toccati».
- [ ] Nuovo ADR in `docs/DECISIONS.md`; `docs/STATUS.md` e `docs/API.md`
      aggiornati.

## File toccati

```
services/route-engine/route_engine/directions.py
services/route-engine/tests/test_directions.py
services/api/shaperoute_api/jobs.py
services/api/shaperoute_api/schemas.py
services/api/tests/…                               (test delle indicazioni)
packages/shared-types/src/index.ts
packages/shared-types/fixtures/…
docs/API.md, docs/DECISIONS.md, docs/STATUS.md
```

## Fuori scope

- `app.py`: un altro task ci lavora (precaricare il modello dell'AI,
  TASK-052). L'endpoint sincrono resta senza indicazioni; se servisse,
  fermarsi e dirlo.
- `optimizer.py`, `__main__.py`, `network.py`: TASK-050 (lettere).
- `apps/mobile`: schermata e voce sono TASK-049, dopo il tema.
- I nomi dei marciapiedi: TASK-053.

## Esito

*(da compilare)*
