# TASK-091 — Nessuna partenza nel log a schermo dell'API

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-091-no-start-in-log`

Chiesto dall'utente il 2026-09-30, dopo TASK-090: «togli le partenze dal
log a schermo dell'API». Numeri presi senza coordinatore: TASK-091 (110–122
sono della parte social), ADR-0092 (0084, 0090, 0091 presi).

## Obiettivo

Il log dell'API non contiene più le coordinate di dove parte l'utente.

## Contesto da leggere

- `docs/tasks/TASK-090.md`, «Esito»
- `services/route-engine/route_engine/nearby_starts.py`, `plan_nearby`

## Cosa fare

1. Togliere le coordinate dalla riga «start N (lat, lon): …».
2. Provare con l'API vera che nel log non resti nessuna coordinata della
   partenza, anche quando la forma non si può disegnare.
3. `UI.md`, «Cosa esce dal telefono».

## Criteri di accettazione

- [x] La riga delle partenze provate non ha coordinate (test).
- [x] L'errore di una partenza che non disegna non ha coordinate (test).
- [x] Prova vera: tre richieste (cuore, parola, un gatto che non si può
      disegnare), nessuna coordinata della partenza nel log.

## File toccati

```
services/route-engine/route_engine/nearby_starts.py
services/route-engine/tests/test_nearby_starts.py
docs/UI.md («Cosa esce dal telefono»), docs/DECISIONS.md (ADR-0092)
docs/STATUS.md, docs/tasks/TASK-091.md
```

## Fuori scope

- Il nome del file del grafo nel log (`foot_45.97750_….graphml`): è il
  riquadro della zona in cache, non la partenza; sta in `graphs.py` e
  `network.py`.
- Il registro delle richieste (TASK-090), che la partenza la scrive apposta.

## Esito

Fatto. La prova vera ha trovato una seconda riga oltre a quella nota:
l'errore di una partenza vicina che non disegna («from (45.99…)»); tolta
anche quella. Dopo la correzione, nel log di tre richieste vere le sole
cifre con decimali sono nei nomi dei file della cache. Percorsi invariati:
cambia solo il testo del log.
