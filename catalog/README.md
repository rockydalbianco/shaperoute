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

### Le uscite in bici (TASK-441 B2)

Un percorso disegnato per la bici ha in più `"activity": "cycling"`; una
corsa non ha il campo, come prima. Nel file di una città le uscite stanno
**in fondo**, dopo ogni corsa: una corsa tiene il suo posto, e quindi il suo
id. L'API le dà solo a chi chiede `activity=cycling`.

```
zsh out/TASK-441/b2/run-bike.sh                # il giro, una città alla volta
python tools/catalog_bike.py --page out/TASK-441/b2/tutti.html --every
python tools/catalog_bike.py --propose         # le chiavi da tenere
python tools/catalog_bike.py --write           # catalog/seed dai quattro registri
```

`tools/catalog_bike.py` disegna sulla rete della bici, dalla piazza delle
stesse città, una forma per città a 20, 25 o 30 km a turno (il motore
disegna in bici fino a 30 km). Registro `out/TASK-441/bike.jsonl`, chiave
`città/forma@cycling/distanza`, filtro di `catalog_seed.py` com'è.

**Le zone della bici non si scaricano da Overpass** (`docs/MAPS.md`, «Le
zone della bici», ADR-0153): si ritagliano da un estratto di Geofabrik con
`--extract` (`osmium tags-filter … w/highway`, poi il ritaglio di
`zone_extract.py`). Il ritaglio di osmium vuole circa 3,7 GB per un paio di
secondi, qualunque sia l'estratto.

**Il filtro non dice se una forma si legge**, come per le parole. Delle
dodici forme provate, guardate una per una, otto si leggono (cuore, stella,
farfalla, gatto, sole, cerchio, luna, pesce: `READS` nello strumento) e
quattro no (smiley, cavallo, chiocciola, testa di cane): si disegnano e si
tengono solo le otto, per scelta dell'utente (2026-11-18).

Dal 18 novembre 2026 il seme ha **1694 percorsi**: le 1546 corse di prima e
**148 uscite in bici in 29 città italiane** (54 da 20 km, 49 da 25, 45 da
30).

Dal secondo giro (2026-11-22) il seme ha **1866 percorsi**: si aggiungono
**172 uscite in bici in 25 città estere** (in tutto 320 in 54 città: 116 da
20 km, 105 da 25, 99 da 30). Le zone vengono dall'estratto di Geofabrik del
paese o della regione, uno per città (`out/TASK-441/b2/run-estere.sh`; per
Amburgo, Londra, New York e Amsterdam più pezzi uniti con `osmium merge`).
Sette città restavano fuori: con la loro zona il pianificatore passa i 4 GB
sul Mac.

Per quelle sette il limite è salito a 5 GB (deciso dal Coordinatore,
2026-11-22; `out/TASK-441/b2/run-sette.sh`, a Mac vuoto): entrano **36
uscite a Berlino, Dublino, New York, Amburgo e Vienna**, e il seme ha
**1902 percorsi** (356 uscite in bici in 59 città: 131 da 20 km, 115 da 25,
110 da 30). **Parigi e Tokyo non hanno uscite in bici**: passano anche i
5 GB.

### Le uscite lunghe in bici, 40 e 50 km (TASK-441 B3)

```
zsh out/TASK-441/b3/run-b3.sh 1                # 50 e 40 km, una città alla volta
zsh out/TASK-441/b3/run-b3.sh 2                # solo 40 km
python tools/catalog_bike.py --page out/TASK-441/b3/disegni-bici-lunghi.html --every --distances 50000 40000
python tools/catalog_bike.py --propose         # le chiavi da tenere
python tools/catalog_bike.py --write           # catalog/seed dai quattro registri
```

Le uscite da 40 e 50 km stanno **solo nel catalogo** (scelta dell'utente,
2026-11-23): «Draw» in bici resta a 10–30 km e il limite del motore
(`activities/cycling.py`) non cambia. `catalog_bike.py --distances 50000
40000` alza il limite solo nel proprio processo (`ride_limit`) e disegna le
stesse otto forme, cinque a una distanza e tre all'altra, a turno per città.
Stesso registro (`out/TASK-441/bike.jsonl`), stesso filtro, zone ritagliate
dagli estratti già sul disco (nessun download; Overpass chiuso: un candidato
che esce dalla zona ritagliata fallisce, quasi sempre cuore o cerchio alla
distanza più lunga).

**In un file di città le uscite lunghe stanno dopo le uscite che c'erano**
(`catalog_seed._place`, `LATER_RIDES_FROM_M`): l'API numera un percorso col
suo posto nel file (`recommended.py`), quindi corse e uscite da 20–30 km
tengono il loro id.

Dal 23 novembre 2026 il seme ha **2031 percorsi**: entrano **129 uscite
lunghe in 32 città** (42 da 50 km, 87 da 40), tutte quelle che passano il
filtro delle 213 disegnate in 34 città (limite del pianificatore 4 GB). In
tutto 485 uscite in bici in 60 città (Levico è nuova: aveva solo corse).
Otto città hanno solo i 40 km (Brescia, Torino, Lubiana, Padova, Porto,
Edimburgo, Firenze, Zagabria: a 50 km la zona non sta nei 4 GB); Genova e
Nizza non ne hanno nessuna che passi; Amsterdam passa i 4 GB anche a 40 km,
e Sydney, Valencia, Milano e Barcellona, più grandi, non sono state provate.
Le altre città hanno uscite fino a 30 km, come prima.

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
