# TASK-139 — Anche cerchio e stella senza «baffi»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-139-clean-circle-star`

Chiesto dall'utente il 2026-10-01, dopo TASK-131: «fai lo stesso per
cerchio e stella». Numero: TASK-138 è stato preso nello stesso momento da
un'altra sessione (suggerimenti dei luoghi).

## Obiettivo

Cerchio e stella evitano i pezzi di strada fatti avanti e indietro, come il
cuore (ADR-0107), senza cambiare le altre forme.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0107; `docs/ROUTE_ENGINE.md` «Funzione
  obiettivo», «I baffi del cuore»

## Cosa fare

1. Misurare cerchio e stella sulle 7 partenze di TASK-131, senza e con il
   peso dei baffi.
2. Far giudicare all'utente quelle che cambiano.
3. Aggiungere il peso per le forme approvate; test; documenti.

## Criteri di accettazione

- [x] Cerchi e stelle misurati senza e con il peso (`ROUTE_ENGINE.md`).
- [x] L'utente ha giudicato le stelle che cambiano: 2 meglio, 1 senza
      preferenza (il cerchio non cambia).
- [x] Le altre forme danno gli stessi percorsi (registro rifatto:
      cavallo, farfalla, CIAO, cerchio).
- [x] Test deterministici; ADR-0109; `ROUTE_ENGINE.md`.
- [x] Provato sull'iPhone dall'utente (2026-10-01): «funziona».

## File toccati

```
services/route-engine/route_engine/optimizer.py      (W_DOUBLED)
services/route-engine/tests/test_retracing.py
samples/TASK-139_*, samples/LOG.md
docs/ROUTE_ENGINE.md, docs/DECISIONS.md (ADR-0109), docs/STATUS.md,
docs/tasks/TASK-139.md
```

## Fuori scope

- Le forme con tratti ripassati apposta (gatto, pesce, lettere, immagini).
- Le altre forme del catalogo senza tratti (cavallo, luna, farfalla…):
  un giudizio ciascuna, se l'utente lo chiede.

## Esito

Cerchio: nessuno dei 7 cambia (aveva già 0–7% di baffi). Stella: 3 su 7
cambiano; Levico 8 km (39% → 17%) e Trento 15 km (6% → 2%) giudicate
meglio, Levico 5 km senza preferenza. Peso doppio scartato. Provato
sull'iPhone dall'utente: funziona.
