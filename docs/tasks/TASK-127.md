# TASK-127 — Overpass dall'indirizzo che risponde

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-127-overpass-address`

Chiesto dall'utente il 2026-10-01 («sì, procedi»): da questo Mac uno dei
due indirizzi di Overpass rifiuta sempre, e ogni zona nuova falliva.

## Obiettivo

Il motore scarica le zone nuove anche quando uno degli indirizzi di
Overpass rifiuta le connessioni.

## Contesto da leggere

- `docs/MAPS.md`, «Overpass: come si scarica»; ADR-0100

## Cosa fare

1. `route_engine/overpass_address.py`: l'indirizzo che risponde, usato per
   la durata di un download, un download alla volta.
2. Usarlo nei download dei grafi e nelle vie con nome (`network.py`).
3. Provarlo su una zona mai scaricata.

## Criteri di accettazione

- [x] Test deterministici, senza rete (resolver e connessioni finti).
- [x] I nomi diversi da quello di Overpass si risolvono come sempre, e
      tutto torna com'era dopo il download, anche se fallisce.
- [x] Una zona nuova si scarica dal Mac: Verona centro, 2459 nodi, 10 s.

## File toccati

```
services/route-engine/route_engine/overpass_address.py
services/route-engine/route_engine/network.py
services/route-engine/tests/test_overpass_address.py
docs/MAPS.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-127.md
```

## Fuori scope

- Un server Overpass alternativo; il download nell'immagine Docker.

## Esito

Verona centro scaricata in 10 s attraverso 162.55.144.139, dove prima ogni
download finiva in «Connection refused».
