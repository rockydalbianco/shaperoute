# TASK-053 — Nomi dei marciapiedi

**Stato**: Todo
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

- [ ] `ruff`, `black`, `pytest -m "not network"` puliti.
- [ ] Nessun `along` su un marciapiede lontano più della soglia da una via
      con nome (test su un grafo salvato).
- [ ] A Milano la quota di indicazioni senza nome né `along` è scritta
      nell'esito, prima e dopo.
- [ ] Nuovo ADR; `docs/MAPS.md` e `docs/STATUS.md` aggiornati.

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

*(da compilare)*
