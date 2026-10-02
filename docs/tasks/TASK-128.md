# TASK-128 — Il catalogo seme: le città mancanti, New York e le frasi

**Stato**: In revisione
**Fase**: 4 · **Branch**: `feat/TASK-128-seed-catalog-more`

Seguito di TASK-125 (ADR-0097), chiesto dall'utente il 2026-10-01:
continuare il giro del catalogo quando Overpass riapre.

## Obiettivo

`catalog/seed/` con tutte le 13 città, New York e le frasi di ogni città
(`PHRASES`), guardati a occhio come le prime 6.

## Contesto da leggere

- ADR-0097 (e la sua aggiunta), ADR-0100; `catalog/README.md`;
  `docs/MAPS.md` («Overpass: come si scarica»)

## Cosa fare

1. Una sola zona per città prima dei suoi casi (`engine_prepare`), con
   un minuto di pausa dopo ogni download: Overpass smette di rispondere
   dopo molti download di fila (giorno 2026-10-01, dopo New York).
2. Il giro: `python -m route_engine.seed_catalog --run`, che riprende dal
   registro (`out/seed_catalog/runs.jsonl`, 235 casi fatti).
3. Le nuove città e le frasi guardate a occhio; gli illeggibili in
   `UNREADABLE`; i più belli in `samples/LOG.md`.

## Criteri di accettazione

- [x] Ogni città ha la sua zona scaricata una volta; una città la cui zona
      non si scarica si salta e resta per il giro dopo (test verdi).
- [ ] Firenze, Napoli, Verona, Padova, Genova, Bari, Palermo e New York in
      `catalog/seed/`, con le frasi. **Solo Firenze**: Overpass ha chiuso
      dopo la sua zona (20:40 del 2026-10-01) e non ha riaperto nella
      notte; si chiude con le città fatte, il resto è un seguito.
- [x] Ogni percorso nuovo guardato; gli illeggibili fuori.

## File toccati

```
services/route-engine/route_engine/seed_catalog.py
services/route-engine/tests/test_seed_catalog.py
catalog/seed/*.json
samples/LOG.md
docs/STATUS.md
docs/tasks/TASK-128.md
docs/tasks/TASK-126.md   (solo lo stato: Done, mergiato)
docs/tasks/TASK-129.md   (solo lo stato: Done, mergiato)
docs/tasks/TASK-134.md   (solo lo stato: Done, mergiato)
```

## Fuori scope

- Altre città oltre le 13 e New York (le zone delle città in evidenza sono
  TASK-137).

## Esito

Firenze aggiunta al catalogo: 22 percorsi tenuti su 33, guardati a occhio
(10 illeggibili in `UNREADABLE`, i più belli in `samples/LOG.md`). Il
catalogo ha 159 percorsi in 7 città. Il giro prepara una zona per città e
salta quelle che non si scaricano: Overpass ha concesso un solo download
grosso (Firenze, 20:35) e poi ha rifiutato per tutta la notte.

**Seguito** (un task nuovo): Napoli, Verona, Padova, Genova, Bari,
Palermo, New York e le frasi di tutte le città. Basta rilanciare, quando
Overpass risponde, `python -m route_engine.seed_catalog --run` dalla radice
(ambiente `services/api/.venv`): riprende dal registro
`out/seed_catalog/runs.jsonl` (sul Mac, 268 righe), una città per giro.
