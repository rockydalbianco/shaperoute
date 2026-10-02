# TASK-161 — Le città e le frasi nuove nel catalogo seme

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-161-seed-catalog-cities`

Seguito di TASK-128. Il giro del catalogo del 2026-10-02 ha pianificato le
14 città e le loro frasi; l'utente ha scelto «Solo parole corte».
Assegnato dal coordinatore il 2026-10-02.

## Obiettivo

Portare in `main` il catalogo seme di tutte le 14 città, con le parole che
si leggono, e le modifiche allo script servite per farlo.

## Contesto da leggere

- `docs/tasks/TASK-125.md`, `docs/tasks/TASK-128.md`
- `docs/DECISIONS.md` ADR-0097
- `catalog/README.md`

## Cosa fare

1. `PHRASES` solo con parole corte (ADR-0130).
2. `UNREADABLE` con le forme illeggibili delle città nuove;
   `UNREADABLE_WORDS` (città, parola, stile) per le parole; `select` tiene
   fuori anche le parole non più in `PHRASES`.
3. `engine_prepare` non scarica niente se la zona di ogni caso è già in
   cache (zone costruite sul server dall'estratto Geofabrik).
4. Test deterministici; `catalog/seed/` rigenerato; righe in
   `samples/LOG.md`; ADR-0097 (aggiornamento) e ADR-0130.

## Criteri di accettazione

- [x] `catalog/seed/` ha un file per ognuna delle 14 città.
- [x] Nessuna parola oltre le 5 lettere; quelle giudicate illeggibili fuori.
- [x] Test deterministici, senza rete, verdi.
- [x] ADR-0097 aggiornata, ADR-0130 scritta, STATUS e LOG aggiornati.

## File toccati

```
services/route-engine/route_engine/seed_catalog.py
services/route-engine/tests/test_seed_catalog.py
catalog/README.md
catalog/seed/*.json
samples/LOG.md
tools/test_sample_feed.py
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-161.md
```

## Fuori scope

- Il feed d'esempio (`apps/mobile/src/feed/sampleFeed.json`, TASK-156):
  non rigenerato qui.
- Le forme a 21 km di Bari, Palermo e New York: Overpass rifiuta ancora il
  Mac. Il giro staccato sul Mac (`out/seed_catalog/run_rounds.sh`) le
  aggiunge al registro quando riapre: un seguito rigenera i tre file.

## Note

- **`tools/sample_feed.py` (TASK-156)**: rilanciato sul catalogo nuovo
  sceglierebbe altre figure. 12 su 15 cambiano: entrano Verona, Palermo,
  Bari, Genova, Napoli, Padova e New York; restano Levico cavallo 21,
  Trento stella 5, Bologna luna 5. Il feed dell'app non cambia finché
  qualcuno non rilancia lo script. `tools/test_sample_feed.py` legge il
  catalogo vero: con 14 città e 15 post non può dare due figure a città,
  quindi ne chiede almeno una (ok del coordinatore).
- **Seguito, da decidere con l'utente**: il Feed di esempio l'utente l'aveva
  chiesto con «sette città d'Italia». Rilanciato sul catalogo nuovo,
  `sample_feed.py` sceglierebbe anche New York e le altre: prima di
  rigenerare `sampleFeed.json` va chiesto all'utente.
- **Per TASK-163**: `newyork.json` ha già a 5 km il cerchio (0,98), il
  cuore (0,97) e la stella (0,98), tutti tenuti a occhio; anche cavallo,
  luna e pesce.

## Esito

Catalogo seme di 323 percorsi in 14 città, con le parole corte che si
leggono (Bologna nessuna). Restano le forme a 21 km di Bari, Palermo e
New York, quando Overpass riapre.
