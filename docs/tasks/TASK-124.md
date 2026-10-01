# TASK-124 — Nessuna posizione nel log di accesso dell'API

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-124-no-position-in-access-log`

## Obiettivo

Segnalato dalla sessione di TASK-090/091 dopo il merge di TASK-123: il log
di accesso scrive `GET /places?q=…&lat=…&lon=…`, cioè la posizione
dell'utente, che ADR-0092 tiene fuori dal log. Alla fine il log non ha
query string.

## Contesto da leggere

- `docs/DECISIONS.md`, ADR-0092, ADR-0095, ADR-0096
- `docs/UI.md`, «Cosa esce dal telefono»

## Cosa fare

1. Un filtro sul logger `uvicorn.access` che toglie la query string,
   messo all'avvio dell'API.
2. Un test che la riga di `/places` non ha coordinate né testo.

## Criteri di accettazione

- [x] La riga di `GET /places?…&lat=…&lon=…` nel log è `GET /places`.
- [x] Le altre righe restano come prima.
- [x] Provato sull'API del Mac, riavviata con `--lan --request-log`.

## File toccati

```
services/api/shaperoute_api/access_log.py
services/api/shaperoute_api/__main__.py
services/api/tests/test_access_log.py
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-124.md
```

## Fuori scope

- Cancellare le righe già scritte in `~/Library/Logs/shaperoute-api.log`:
  dati dell'utente, lo decide l'utente.

## Esito

Fatto e provato: dopo il riavvio la ricerca scrive solo
`"GET /places HTTP/1.1" 200`. Restano nel file le righe di prima del
filtro.
