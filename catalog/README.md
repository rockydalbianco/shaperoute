# Catalog — I percorsi consigliati

Il seme dei percorsi che la schermata «Explore» propone (TASK-092), prima
che gli utenti ne generino di loro. Decisione in ADR-0097.

## `seed/`

Un file per città, `seed/<città>.json`, prodotto dal motore:

```
python -m route_engine.seed_catalog --run
```

dalla radice del repository, con l'ambiente del motore. Pianifica ogni
forma del catalogo a 5, 10 e 21 km e le frasi di ogni città (13 città
italiane e New York), come l'API, e
tiene quelle con somiglianza da 0,88 in su, tutte. Il registro di ogni
prova sta in `out/seed_catalog/runs.jsonl` (fuori dal repository): un giro
interrotto riparte da dove era; senza `--run` rifà solo la selezione, per
esempio con `--min-similarity 0.9`.

Ogni file:

```json
{
  "city": "trento",
  "centre": [46.067, 11.1215],
  "min_similarity": 0.88,
  "license": "Routes on OpenStreetMap data, (c) OpenStreetMap contributors, ODbL 1.0: …",
  "routes": [
    {"shape": "heart", "distance_m": 10000, "route_m": 10240,
     "similarity": 0.93, "planned_at": "2026-10-01T10:20:00Z",
     "points": [[46.067012, 11.121498], …]}
  ]
}
```

Una parola (le frasi di `PHRASES`, ADR-0097) ha `"word"` e `"style"`
(`round` o `block`) al posto di `"shape"`. Una parola scritta lettera per
lettera, a penna alzata (TASK-441, ADR-0366), ha in più `"walks"`: coppie
di indici di `points`, in ordine, i tratti che si percorrono fra una
lettera e l'altra senza disegnare (come `RouteResult.walks`). `distance_m`
è quella chiesta per il disegno (3 km a lettera), `route_m` tutta la strada,
tratti fra le lettere compresi.
Solo parole corte (ADR-0130): CIAO e TIAMO nelle città italiane, più AO e
AMOR a Roma, BONA a Firenze, UE a Bari, UELA a Milano; a New York LOVE,
HEY e NYC. Oltre le 4–5 lettere, al tetto dei 21 km, non si leggono.

### Il catalogo grande (TASK-419, ADR-0347)

Da TASK-419 i file di `seed/` li scrive `tools/catalog_seed.py`, che usa
`seed_catalog` senza cambiarlo: pianifica circa 1000 casi città × forma o
parola × distanza (le piazze delle città sono nello strumento), una zona
per città da Overpass con l'attesa dello slot, tiene un registro in
`out/TASK-419/runs.jsonl`, filtra (somiglianza ≥ 0,90, distanza ±10%,
ripassi in più ≤ 10%, niente `motorway`/`trunk`) e propone una
preselezione; `tools/catalog_review.py` fa la pagina HTML con cui
**l'utente sceglie**. Le chiavi tenute stanno in `tools/catalog_kept.json`
e `--write` riscrive i file di `seed/` da lì: i file delle città del seme
sono stati riscritti con i tenuti (155 percorsi in 23 città il 2026-11-08).
Il filtro e la scrittura hanno test deterministici in `tools/`.

### Le parole corte e i disegni già fatti (TASK-441)

`tools/catalog_words.py` aggiunge al catalogo, senza cambiare
`catalog_seed.py`: i disegni del registro di TASK-419 che passano il filtro
e non erano tenuti, di forme che il motore ha (`spare`); e molte parole di
2–4 lettere su una riga, scritte in ogni città nei due stili, di cui entra
la migliore (`best_words`). Le parole per città (quelle sue, quelle della
lingua, un turno di una lista comune con la stagione e le parole del
momento) sono nello strumento e le ha approvate l'utente il 2026-11-11.

```
bash out/TASK-441/run.sh                       # il giro, dalle zone in cache
python tools/catalog_words.py --propose        # le chiavi da tenere
python tools/catalog_words.py --write          # catalog/seed dai due registri
```

Il giro non scarica niente: usa le zone a piedi di `data/cache`. Parole più
lunghe vogliono la penna alzata, che questo formato non tiene ancora.

Dall'11 novembre 2026 il seme ha **1261 percorsi in 63 città** (erano
572): le 689 forme già disegnate che passano il filtro. Le parole aggiunte
quel giorno, a riga unica con le lettere unite, non si leggevano e sono
uscite: tornano a penna alzata, come gli esempi di città, quando il
formato terrà le camminate fra le lettere (TASK-441 B).

### Le parole a penna alzata (TASK-441 B1, ADR-0366)

```
bash out/TASK-441/run-pen-up.sh                        # il giro, dalle zone in cache
python tools/catalog_words.py --pen-up --page out/TASK-441/penup/parole.html
python tools/catalog_words.py --pen-up --propose       # le chiavi da tenere
python tools/catalog_words.py --write                  # catalog/seed dai tre registri
```

Ogni parola è chiesta come la chiedono gli esempi di città dell'app
(`city_examples.py`): lettere tonde, ognuna disegnata da sola, 3 km a
lettera, al massimo 6 lettere. Il registro è `out/TASK-441/pen-up.jsonl`,
la chiave `città/PAROLA:pen_up/distanza`. Il filtro guarda la somiglianza
(≥ 0,90), la lunghezza del **solo disegno** (±10%: i tratti fra le lettere
si aggiungono, in media il 20%) e le strade.

**Il filtro non dice se una parola si legge.** Delle 761 parole che lo
passavano, lette una per una alla grandezza di una scheda dell'app e senza
il nome sotto, se ne leggevano 340: le loro chiavi sono in
`tools/catalog_pen_up_read.json`, e solo quelle entrano. Una parola di un
giro nuovo resta fuori finché qualcuno non la legge e ne aggiunge la
chiave. Le parole a riga unica di prima (55) sono uscite.

Dal 12 novembre 2026 il seme ha **1546 percorsi in 63 città**: 1206 forme e
340 parole a penna alzata.

### Le città in evidenza

Le città che «Explore» mostra per prime (`FEATURED_CITIES` nell'app) e che
non sono nel seme hanno solo le tre forme più semplici, perché siano già lì
quando si tocca la città (TASK-163, ADR-0132):

```
python -m route_engine.seed_catalog --run --featured
```

Un cuore, un cerchio e una stella da 5 km da una piazza del centro
(`FEATURED` in `seed_catalog.py`): Londra, Parigi, Tokyo, Barcellona,
Dubai, Amsterdam, Lisbona, Sydney, San Francisco. **Berlino manca**: la sua
zona non è sul server e Overpass rifiuta il Mac (`MAPS.md`). Il giro
intero (`--run` da solo) non le tocca. `tools/test_featured_catalog.py`
controlla che ogni città in evidenza abbia le tre forme entro 5 km dal
centro che l'API dà per il suo nome.

Distanze in metri, punti `[lat, lon]` WGS84. I percorsi stanno su strade
di OpenStreetMap: chi li pubblica cita «© OpenStreetMap contributors».

Si guardano con `tools/preview_samples.py` dopo averli scritti in GPX, o
incollando i punti in [geojson.io](https://geojson.io).
