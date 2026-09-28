# TASK-080 — Lo stile delle lettere come scelta nell'app

**Stato**: In corso — codice e test fatti, manca la prova sull'iPhone
**Fase**: 4 · **Branch**: `feat/TASK-080-letter-style`

## Obiettivo

Chi scrive una parola nell'app sceglie le lettere di oggi o quelle
squadrate (ADR-0072), e il percorso arriva in quello stile.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0072 (lettere squadrate), ADR-0051 (la parola
  nell'API), ADR-0053 (la parola nell'app)
- `docs/API.md` «Una parola invece di una forma»
- `docs/UI.md` la parte della parola

## Cosa fare

1. `style` in `RouteRequest` del motore, controllato; `plan_route` e le
   partenze vicine (`ShapeJob.of_request`) lo usano.
2. `style` nel corpo della richiesta dell'API, passato al motore.
3. `LETTER_STYLES`, `LetterStyle` e `style?` in `shared-types`; fixture e
   `contract.json`.
4. Nell'app un selettore «Round | Square» sotto il campo della parola; la
   richiesta porta `style`.
5. Test deterministici per ogni parte; `API.md`, `UI.md`, ADR-0075.

## Criteri di accettazione

- [x] `RouteRequest(word=..., style="block")` scrive la parola squadrata;
      senza `style` è come prima; `"block"` con una forma è rifiutato.
- [x] `POST /routes` e `/route-jobs` accettano `style` e lo passano al
      motore; uno stile sconosciuto è `invalid_request`.
- [x] `shared-types` e fixture hanno `style`; i test di contratto lo
      confrontano da tutti e due i lati.
- [x] Nell'app «Square» manda `style: "block"`, «Round» `"round"` (test).
- [ ] Prova sull'iPhone: una parola squadrata e una tonda disegnate dallo
      stesso punto.

## File toccati

```
services/route-engine/route_engine/models.py
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/nearby_starts.py
services/route-engine/tests/test_words.py
services/route-engine/tests/test_nearby_starts.py
services/route-engine/tests/test_contract.py
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/app.py
services/api/tests/test_contract.py
services/api/tests/test_routes.py
packages/shared-types/src/index.ts
packages/shared-types/test/contract.test.ts
packages/shared-types/fixtures/contract.json
packages/shared-types/fixtures/route-request.json
packages/shared-types/fixtures/route-request-word.json
packages/shared-types/fixtures/gpx-request.json
apps/mobile/App.tsx
apps/mobile/__tests__/App.test.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanel.test.tsx
apps/mobile/src/route/useRouteRequest.ts
apps/mobile/src/route/useRouteRequest.test.ts
docs/API.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-080.md
```

## Fuori scope

- `--style` nella CLI (`__main__.py`): non chiesto; i campioni di TASK-077
  passano da uno script.
- Ricordare lo stile fra un avvio e l'altro (servirebbe una dipendenza).
- Una stima della barra diversa per le lettere squadrate (`progress.ts`).
- Cambiare il disegno delle lettere squadrate (ADR-0072).

## Prova sull'iPhone

*(dopo la prova)* Dalla radice: API aggiornata (`SETUP.md`, passo 10) e
`npm run mobile`. «Word», «CIAO», 15 km: una volta «Round», una volta
«Square», dallo stesso punto; il secondo deve avere tratti dritti o a 45°.

## Esito

*(a fine task)*
