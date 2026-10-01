# TASK-125 — Il seme del catalogo dei percorsi consigliati

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-125-seed-catalog`

Chiesto dall'utente il 2026-10-01, dopo il mockup di TASK-092 (variante C,
la schermata «Explore»): «inizia a creare tu un po' di esempi, scegli
quelli venuti meglio e inizia a fare un catalogo», partendo da 13 città.

Allargato dall'utente lo stesso giorno: anche le frasi (ciao, ti amo,
grazie, buongiorno, hello…) nella lingua di ogni città, e New York.

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
1b. Le frasi di `PHRASES`, per città, nella lingua del posto, tonde e
   squadrate (`--kinds words`), e New York fra le città (ADR-0097,
   aggiunta).
2. Tenere i percorsi con somiglianza da `MIN_SIMILARITY` (0,88) in su,
   tutti, anche se equivalenti; un file per città in `catalog/seed/`.
3. Guardare a occhio un campione dei tenuti per città e annotare in
   `samples/LOG.md` se la soglia regge.
4. Scrivere in TASK-092 la scelta dell'utente: la variante C.

## Criteri di accettazione

- [x] `python -m route_engine.seed_catalog --run` gira da riga di comando,
      senza API né chiavi; fermato e rilanciato non rifà i casi già fatti.
- [x] Test deterministici dello script, senza rete, verdi in CI.
- [x] `catalog/seed/` ha un file per ognuna delle città con almeno un
      percorso tenuto, con la licenza dei dati OSM dentro. **Per 6 città su
      13**: l'utente ha chiesto di aprire la PR così (2026-10-01); le altre
      7, New York e le frasi si generano con un nuovo giro, in un task a
      parte.
- [x] Nessuna posizione di persone: solo piazze centrali.
- [x] TASK-092 dice che la scelta è la variante C.

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

## Dove sono arrivato (2026-10-01, 13:52)

- Fatte 6 città su 13: Trento 27 percorsi tenuti, Levico 19, Milano 33,
  Roma 31, Torino 32, Bologna 31 (173 in tutto, su 197 disegnati; soglia
  0,88). Trento e Milano viste a occhio dall'utente: il pesce di Trento
  scartato (`REJECTED`), il resto va bene.
- Firenze e Napoli: Overpass ha rifiutato la connessione («Connection
  refused») per tutti i casi; giro fermato per non sprecare ore. Mancano
  Firenze, Napoli, Verona, Padova, Genova, Bari, Palermo.
- Per riprendere, quando Overpass risponde: dalla radice
  `python -m route_engine.seed_catalog --run` (ambiente
  `services/api/.venv`). Il registro `out/seed_catalog/runs.jsonl` è sul
  Mac, fuori dal repository: i casi fatti non si rifanno, quelli falliti
  sì.

## Esito

Catalogo seme di 137 percorsi in 6 città (Trento, Levico, Milano, Roma,
Torino, Bologna), tutti guardati a occhio: 36 illeggibili tolti
(`UNREADABLE`), i più belli in `samples/LOG.md`. Lo script ha anche le
frasi di ogni città e New York, non ancora generate: Overpass, da questo
Mac, risponde solo da uno dei due indirizzi (`MAPS.md`). Seguito: un nuovo
giro per Firenze, Napoli, Verona, Padova, Genova, Bari, Palermo, New York
e le frasi.
