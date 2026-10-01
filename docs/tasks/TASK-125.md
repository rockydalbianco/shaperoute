# TASK-125 — Il seme del catalogo dei percorsi consigliati

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-125-seed-catalog`

Chiesto dall'utente il 2026-10-01, dopo il mockup di TASK-092 (variante C,
la schermata «Explore»): «inizia a creare tu un po' di esempi, scegli
quelli venuti meglio e inizia a fare un catalogo», partendo da 13 città.

## Obiettivo

I percorsi migliori del motore in 13 città italiane, salvati in file nel
repository, pronti da caricare nel database quando ci sarà (TASK-114) e da
mostrare in «Explore» (TASK-092).

## Contesto da leggere

- `docs/tasks/TASK-092.md` (punto 3: a parità di qualità si tengono tutti)
- `docs/DECISIONS.md` ADR-0071 (partenze vicine), ADR-0086, ADR-0097
- `samples/README.md` (come si guarda un percorso)

## Cosa fare

1. Uno script del motore, `python -m route_engine.seed_catalog --run`, che
   pianifica ogni forma del catalogo a 5, 10 e 21 km dal centro di 13
   città, come l'API (`plan_nearby`), con un registro che riprende da dove
   si era fermato.
2. Tenere i percorsi con somiglianza da `MIN_SIMILARITY` (0,88) in su,
   tutti, anche se equivalenti; un file per città in `catalog/seed/`.
3. Guardare a occhio un campione dei tenuti per città e annotare in
   `samples/LOG.md` se la soglia regge.
4. Scrivere in TASK-092 la scelta dell'utente: la variante C.

## Criteri di accettazione

- [ ] `python -m route_engine.seed_catalog --run` gira da riga di comando,
      senza API né chiavi; fermato e rilanciato non rifà i casi già fatti.
- [ ] Test deterministici dello script, senza rete, verdi in CI.
- [ ] `catalog/seed/` ha un file per ognuna delle città con almeno un
      percorso tenuto, con la licenza dei dati OSM dentro.
- [ ] Nessuna posizione di persone: solo piazze centrali.
- [ ] TASK-092 dice che la scelta è la variante C.

## File toccati

```
services/route-engine/route_engine/seed_catalog.py
services/route-engine/tests/test_seed_catalog.py
catalog/README.md
catalog/seed/*.json
samples/LOG.md
docs/tasks/TASK-092.md
docs/tasks/TASK-125.md
docs/DECISIONS.md
docs/STATUS.md
```

## Fuori scope

- Il database e il caricamento dei file (TASK-114).
- La schermata «Explore» nell'app (TASK-092).
- Più partenze per città, altre città, le parole: si allarga dopo, dove
  ci sono utenti.
- Toccare il motore per migliorare i percorsi.

## Esito
