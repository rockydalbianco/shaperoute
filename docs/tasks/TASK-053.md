# TASK-053 — Nomi dei marciapiedi

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-053-sidewalk-names` (da `main`, dopo
TASK-050, che lavora su `network.py`)

## Obiettivo

Un'indicazione che entra in un marciapiede senza nome dice lungo quale via
corre («along Via Dante»), così le indicazioni di Milano si capiscono senza
mappa.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0045 (indicazioni), ADR-0022 (rete a piedi)
- `services/route-engine/route_engine/network.py` (`FOOT_FILTER`,
  `OsmnxSource`)
- `services/route-engine/route_engine/directions.py`
- `docs/MAPS.md`, «Overpass: come si scarica»
- `docs/tasks/TASK-047.md`, «Esito»

## Cosa c'è già

Sul cuore da 15 km di Milano 213 indicazioni su 264 entrano in un
`footway` senza nome (TASK-047). In OSM un marciapiede disegnato a parte
corre accanto alla sua strada, a pochi metri e parallelo. Ma la strada col
nome **non è nel grafo**: `FOOT_FILTER` esclude le vie con
`sidewalk=separate`, proprio quelle i cui marciapiedi sono disegnati a
parte.

## Cosa fare

Proposto dall'agente, da confermare prima di iniziare (il punto 1 cambia
come si scaricano le zone):

1. **Tenere i nomi delle strade escluse**: una seconda richiesta a
   Overpass per zona con le sole vie con nome escluse dal filtro, salvata
   accanto al grafo, oppure le stesse vie nel grafo marcate come non
   percorribili. Si sceglie misurando spazio e tempo di download (il disco
   C: è stretto: la cache può andare su D:).
2. **Associare**: per ogni `footway` senza nome, la via con nome più vicina
   e parallela (entro circa 15 m e 20°, da misurare), lungo la maggior parte
   del tratto.
3. **Dirlo come deduzione**: un campo distinto dal nome vero (`along`), mai
   dentro `street`.
4. Misura sui cuori da 15 km di Trento, Levico e Milano: quante indicazioni
   «footway» prendono una via, e un campione controllato sulla mappa.

## Criteri di accettazione

- [x] `ruff`, `black`, `pytest -m "not network"` puliti.
- [x] Nessun `along` su un marciapiede lontano più della soglia da una via
      con nome (test su un grafo salvato).
- [x] A Milano la quota di indicazioni senza nome né `along` è scritta
      nell'esito, prima e dopo.
- [x] Nuovo ADR; `docs/MAPS.md` e `docs/STATUS.md` aggiornati.

## File toccati

```
services/route-engine/route_engine/network.py
services/route-engine/route_engine/directions.py   (o un file nuovo)
services/route-engine/tests/…
docs/MAPS.md, docs/DECISIONS.md, docs/STATUS.md
```

## Fuori scope

- Mostrare `along` nell'app o nella voce: TASK-049.
- Riscaricare tutte le zone in cache: solo quelle dei casi di prova.

## Esito

Fatto il 2026-09-25 (ADR-0054). Il punto 1 l'ha scelto l'utente: un file
a parte con i nomi delle vie escluse, uno per zona (`network.named_roads`,
Trento 106 KB, Levico 5 KB, Milano 1,1 MB). `sidewalks.py` trova la via con
nome più vicina entro 15 m e parallela entro 20° per almeno metà del tratto;
`alongs(graph, nodes, directions, index)` dà la via per ogni indicazione
senza nome, in una lista a parte. Non è un campo di `Direction`: il
contratto era di TASK-056 e un test lo vuole uguale al motore; portarla
all'API e all'app è per TASK-049 o seguenti.

Cuori da 15 km, indicazioni senza nome né via, prima → dopo: **Milano 231
→ 81** (su 265), **Trento 118 → 57** (su 181), **Levico 34 → 30** (su 76).
Delle vie trovate a Milano, 98 vengono solo dalle vie escluse; le altre
anche dal grafo. Campione controllato su openstreetmap.org, quattro a
Milano: giusti tutti. Restano senza via piazze, parchi e i marciapiedi dei
viali più larghi di 15 m. 15 test nuovi (`test_sidewalks.py`).
