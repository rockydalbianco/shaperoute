# TASK-123 — I luoghi della partenza da Geoapify, attraverso l'API

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-123-place-search-api`

## Obiettivo

Chiesto dall'utente dopo TASK-089: «la ricerca è ancora lenta, possiamo
cambiare servizio?». Scelto Geoapify, attraverso l'API. I suggerimenti
arrivano senza i 2–4 s di Photon.

## Contesto da leggere

- `docs/API.md`, «`GET /places`»
- `docs/DEPLOY.md`, «La ricerca dei luoghi»
- `docs/DECISIONS.md`, ADR-0029, ADR-0080, ADR-0083, ADR-0095

## Cosa fare

1. `GET /places` nell'API: Geoapify con la chiave dell'API, cache in
   memoria, 503 senza chiave.
2. L'app chiede all'API e, se non va, a Photon.

## Criteri di accettazione

- [x] `GET /places` risponde come `fixtures/places.json`, con la chiave
      solo verso Geoapify e mai nei messaggi o nel log.
- [x] Le stesse lettere vicino allo stesso punto non si chiedono due volte
      in un'ora.
- [x] Senza API, con l'API lenta o senza chiave l'app trova i luoghi con
      Photon.
- [ ] Chiave creata dall'utente e ricerca provata sull'iPhone.

## File toccati

```
services/api/shaperoute_api/places.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/__main__.py
services/api/tests/test_places.py
services/api/tests/fixtures/geoapify-via-bel.json
packages/shared-types/fixtures/places.json
apps/mobile/src/places/placeFinder.ts
apps/mobile/src/places/placeFinder.test.ts
apps/mobile/src/places/PlaceSearch.tsx
apps/mobile/__tests__/App.test.tsx
.env.example
docs/API.md
docs/DEPLOY.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-123.md
```

## Fuori scope

- Un tipo `Place` in `shared-types`: resta in `photon.ts`.
- Togliere Photon: resta per quando l'API non c'è.

## Esito

Fatto nel codice, con i test (API 209, app 486). Provato dal vivo il
2026-10-01 con la chiave dell'utente: Geoapify risponde in 0,4–1,2 s
(Photon 2–4 s), la stessa ricerca dalla cache in 2 ms; «via bel» vicino a
Trento dà Via Rodolfo Belenzani per prima. L'API sul Mac gira con la
chiave, letta da `.env`. Da fare: la prova sull'iPhone.
