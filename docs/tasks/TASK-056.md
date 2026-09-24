# TASK-056 — La parola nell'API: una richiesta di percorso con `word`

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-056-words-api` (parte da `main`)

Assegnato dal coordinatore su richiesta dell'utente: l'utente vuole
scrivere nell'app la parola da disegnare. Qui la parte dell'API e del
contratto; il campo nell'app è TASK-057, di un'altra sessione.

## Obiettivo

`POST /route-jobs`, `POST /routes` e `POST /gpx` accettano una parola al
posto di una forma, il motore la scrive lettera per lettera (TASK-050), e
una lettera che l'alfabeto non ha, o una parola troppo lunga per la
distanza, riceve un errore che l'app può mostrare così com'è.

## Contesto da leggere

- `docs/API.md`, «Richieste in due tempi», «Errori»
- `docs/DECISIONS.md` ADR-0044 (parole), ADR-0032 (job), ADR-0041
- `services/route-engine/route_engine/words.py`, `models.py`
- `services/api/shaperoute_api/schemas.py`, `jobs.py`, `errors.py`
- `packages/shared-types/src/index.ts` e le fixture

## Cosa fare

Deciso dall'agente su delega dell'utente, salvo la domanda aperta sotto:

1. **Contratto**: `RouteRequest` ha `shape` oppure `word`, uno solo dei
   due. `RouteResult` ha `shape` (null per una parola) e `word` (null per
   una forma). Aggiunte e basta: l'app di oggi manda `shape` e riceve
   `shape`, come prima.
2. **Motore** (`models.py`): `RouteRequest.word`, controllata come le altre
   richieste. Maiuscole o minuscole, solo lettere dell'alfabeto
   (`letters.json`, oggi C, I, A, O); il messaggio dice quali mancano e
   quali ci sono. Al più `MAX_WORD_LETTERS` lettere, e almeno
   `LETTER_DISTANCE_M` metri per lettera: il messaggio dice la distanza
   minima. `plan_route` scrive la parola con `words.compose` e
   `plan_shape(word=...)`.
3. **API**: `schemas.py` con `word` e il validatore «uno dei due»,
   `RouteResultBody.word`; `app.py` passa la parola al motore e la usa nel
   nome del file GPX (solo `to_request` e `gpx_file_name`: vedi «Fuori
   scope»).
4. **shared-types**: tipi, costanti (`LETTERS`, `MAX_WORD_LETTERS`,
   `LETTER_DISTANCE_M`), fixture di una richiesta e di un risultato con
   parola, `contract.json` con l'alfabeto; i test dei due lati le leggono.
5. **`API.md`**: la parola nelle richieste, i suoi errori, i tempi (40–140
   s per «CIAO» a 15 km, ADR-0044).

## Criteri di accettazione

- [ ] Una richiesta con `word` diventa un job che finisce con un percorso
      e con `word` nel risultato (test con un grafo finto).
- [ ] `shape` e `word` insieme, o nessuno dei due: `invalid_request`.
- [ ] Una lettera che l'alfabeto non ha: `invalid_request`, e il messaggio
      nomina la lettera e l'alfabeto.
- [ ] Una parola troppo lunga, o troppo corta la distanza per le sue
      lettere: `invalid_request` con la distanza minima nel messaggio.
- [ ] Le richieste con `shape` rispondono come prima (test esistenti verdi).
- [ ] Fixture e test del contratto verdi sui due lati; l'app compila senza
      modifiche (`npm run typecheck` in `apps/mobile`).
- [ ] `ruff`, `black`, `pytest` puliti in route-engine e api.

## File toccati

```
services/route-engine/route_engine/models.py
services/route-engine/route_engine/optimizer.py        (plan_route)
services/route-engine/route_engine/words.py            (limiti di lunghezza)
services/route-engine/tests/test_contract.py
services/route-engine/tests/test_words.py
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/jobs.py                    (solo il log)
services/api/shaperoute_api/app.py                     (se il coordinatore lo concede)
services/api/tests/test_contract.py, test_route_jobs.py, test_routes.py, test_gpx.py
packages/shared-types/src/index.ts, test/contract.test.ts, fixtures/*
docs/tasks/TASK-056.md, docs/API.md, docs/DECISIONS.md (ADR-0051), docs/STATUS.md
```

## Fuori scope

- Il campo della parola nell'app: TASK-057.
- Le lettere che l'alfabeto non ha ancora: domanda aperta all'utente.
- `app.py` oltre `to_request` e `gpx_file_name`: è di TASK-052.
- Rendere più veloce il motore sulle parole.

## Esito

*(da compilare)*
