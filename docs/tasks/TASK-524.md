# TASK-524 — Test instabile: due percorsi in due processi

**Stato**: In lavorazione · **Coordinatore**: fork 3 · 2026-11-27

## Il problema

`services/api/tests/test_route_processes.py::test_two_routes_are_drawn_at_once_in_two_processes`
prova che due percorsi si disegnano insieme in due worker (TASK-276 B,
ADR-0242). Lo provava col tempo totale misurato nel processo del test:
`time.monotonic() - began < 0.5 * 2 + 0.4`. Sotto carico la CI ha fatto
1,409 s contro 1,4 e il test è fallito (su #1461, il 2026-11-27).

Il tempo totale non era nemmeno una prova pulita: comprende gli import dei
worker (`start()` li avvia ma non aspetta che siano pronti), e un tempo tra
1,0 e 1,4 s passava anche con i due percorsi uno dopo l'altro.

## La correzione

Solo il file di test, nessun codice dell'API.

- Un pianificatore `drawn_when` in cima al file (il worker importa il suo
  pianificatore per nome): fa `helpers.where` (mezzo secondo, il pid come
  distanza) e scrive in `Plan.checks` quando è cominciato e finito, con
  `time.monotonic`, che è un solo orologio per tutti i processi della
  macchina.
- Un primo giro di due percorsi, senza controlli: dopo, tutti e due i
  worker hanno finito i loro import, e uno ancora lento a partire non
  comincia quando l'altro ha già finito.
- Il secondo giro controlla che le due finestre si sovrappongano:
  l'ultimo inizio viene prima della prima fine. Restano i controlli di
  prima: due pid diversi, nessuno quello del test.

Provato in locale: i 10 test del file verdi, il test nuovo verde cinque
volte di fila; con un solo worker (percorsi in fila) fallisce sul
controllo delle finestre.

## File toccati

- `services/api/tests/test_route_processes.py`
- `docs/tasks/TASK-524.md` (nuovo)

## Resta

- Chiusura: riga in `docs/archive/COMPLETATI.md`, task a `Done`.
