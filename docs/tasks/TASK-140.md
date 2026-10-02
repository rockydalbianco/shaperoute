# TASK-140 — Anche le altre forme senza «baffi»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-140-whiskers-other-shapes`

Chiesto dall'utente il 2026-10-01, dopo TASK-139: «fai lo stesso per le
altre forme».

## Obiettivo

Le forme del catalogo evitano i pezzi di strada fatti avanti e indietro
dove l'occhio dell'utente lo preferisce, senza contare come baffi i tratti
che la forma ripassa apposta.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0107, ADR-0109
- `docs/ROUTE_ENGINE.md` «Funzione obiettivo», «I baffi del cuore»

## Cosa fare

1. Contare solo i baffi oltre i tratti voluti della forma.
2. Misurare le 8 forme rimaste sulle 7 partenze di TASK-131, senza e con
   il peso.
3. Far giudicare all'utente i percorsi che cambiano; tenere il peso solo
   dove i nuovi sono preferiti.

## Criteri di accettazione

- [x] I tratti voluti non contano come baffi (test).
- [x] Cuore, cerchio e stella identici a prima (77 percorsi confrontati).
- [x] L'utente ha giudicato i 13 percorsi che cambiavano; il peso resta
      solo per le forme preferite con esso (luna, farfalla, lumaca; il
      cavallo non cambia).
- [x] Sulle prove cambiano solo i 3 percorsi giudicati meglio.
- [x] Test deterministici; ADR-0118; `ROUTE_ENGINE.md`.
- [x] Provato sull'iPhone dall'utente (2026-10-02), con l'API sul server
      Hetzner aggiornata al branch: «funziona».

## File toccati

```
services/route-engine/route_engine/retracing.py      (extra_doubled_share)
services/route-engine/route_engine/optimizer.py      (W_DOUBLED, costo)
services/route-engine/route_engine/nearby_starts.py  (score)
services/route-engine/tests/test_retracing.py
samples/TASK-140_*, samples/LOG.md
docs/ROUTE_ENGINE.md, docs/DECISIONS.md (ADR-0118), docs/STATUS.md,
docs/tasks/TASK-140.md
```

## Fuori scope

- Ritoccare le forme di gatto, pesce e teste.
- Pesi diversi per forma.

## Esito

Correzione rispetto a quanto detto all'utente: farfalla, testa di cane e
testa di coniglio hanno tratti (antenne, occhi, naso, bocca); senza tratti
erano solo cavallo e luna. Giudizio: meglio i nuovi per luna, farfalla,
lumaca; meglio quelli di prima per gatto, pesce, testa di cane e di
coniglio (ADR-0118).
