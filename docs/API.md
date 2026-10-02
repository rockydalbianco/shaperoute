# API — Contratti REST

> Scritto con TASK-022, richieste in due tempi con TASK-025, lettura delle
> parole della forma con TASK-030. Le scelte e i loro motivi stanno in
> ADR-0030, ADR-0032 e ADR-0012.

## Cosa è deciso

- FastAPI + Pydantic, in `services/api/` (pacchetto `shaperoute_api`).
- L'API orchestra, non calcola: il percorso viene da `plan_route` del
  route-engine, che l'API importa (ARCHITECTURE §4).
- `RouteRequest` e `RouteResult` come in `ARCHITECTURE.md` §3, con gli
  stessi campi di `packages/shared-types`: il contratto non cambia.
- Nessun prefisso di versione, nessun CORS (l'app è nativa). Fuori casa
  l'API può chiedere una chiave (`X-API-Key`, TASK-081); gli account, da
  TASK-114, hanno un token di sessione a parte (`Authorization: Bearer`).
  I percorsi restano aperti a tutti: si disegna anche senza account.

## Avvio

Dalla radice del repository, con il venv dell'API (`SETUP.md`, passo 10):

```
python -m shaperoute_api            # solo da questo PC, porta 8000
python -m shaperoute_api --lan      # anche dal telefono, sulla stessa Wi-Fi
```

Con `--lan` stampa l'indirizzo da scrivere sul telefono. `--port` cambia
la porta, `--cache-dir` la cartella dei grafi (default `data/cache`, come
la CLI). `--ai-model` e `--ai-url` scelgono il modello di Ollama che legge
le parole della forma e dove risponde (`AI.md`); senza, valgono quelli del
codice. La documentazione interattiva è su `/docs`.

Da fuori casa (TASK-081, ADR-0076, `DEPLOY.md`): se la variabile
d'ambiente `SHAPEROUTE_API_KEY` è impostata (almeno 16 caratteri), ogni
richiesta tranne `GET /health` deve avere l'intestazione `X-API-Key` con
quel valore; senza, l'API è aperta come prima. I POST sono limitati a
`SHAPEROUTE_RATE_LIMIT` al minuto per client (default 30, 0 = nessun
limite); il polling dei job è GET e non conta. La chiave non si passa mai
da riga di comando.

Con `SHAPEROUTE_DATABASE_URL` (un indirizzo `postgresql://…`) l'API usa il
database degli account (TASK-114, `DATABASE.md`): all'avvio applica le
migrazioni che mancano e lo scrive; se il database non risponde, non
parte. Senza, gli account rispondono `503 accounts_unavailable` e il resto
funziona come prima. Come accenderne uno sul PC: `SETUP.md`, 10.4.

Con `--request-log`, o con `SHAPEROUTE_REQUEST_LOG=1`, l'API scrive ogni
richiesta di percorso in un file, per poterla rifare: «Registro delle
richieste», più sotto. Senza, non scrive niente (è il default).

## Endpoint

### `GET /health`

`200 {"status": "ok"}`. Serve a controllare che l'API risponda.

### Richieste in due tempi: `/route-jobs`

È la strada dell'app (ADR-0032). Un percorso da 15 km o una zona da
scaricare durano più di quanto il telefono aspetta una risposta, quindi la
richiesta risponde subito e il percorso si chiede dopo.

- `POST /route-jobs` con un `RouteRequest` (come sotto) risponde subito
  `202` con un `RouteJob`: `{"job_id", "status", "result": null, "error": null}`.
  Una richiesta non valida risponde `422 invalid_request` senza diventare
  un job.
- `GET /route-jobs/{job_id}` restituisce il `RouteJob` di adesso. `status`
  è uno di:

  | `status` | Vuol dire |
  |---|---|
  | `queued` | in coda: i due thread di lavoro sono occupati |
  | `downloading_map` | la zona non è in cache e si scarica da Overpass |
  | `computing` | grafo pronto (o in lettura dal disco), il motore calcola |
  | `done` | `result` è il `RouteResult` |
  | `failed` | `error` è `{code, message}`, come negli errori sotto |

- `DELETE /route-jobs/{job_id}` annulla: `204`. Una richiesta in coda non
  parte; una che sta caricando il grafo si ferma prima di calcolare; una
  che sta già calcolando finisce nel suo thread e il risultato si butta.
  L'annullamento è un evento delle ricerche (`cancelled`, TASK-142).
- Un `job_id` sconosciuto (annullato, finito da più di 10 minuti, o API
  riavviata) risponde `404 http_error`.

Il `RouteResult` di una richiesta in due tempi porta anche le
**indicazioni di svolta** (`directions`, TASK-048, ADR-0045 e ADR-0047): la
prima è la partenza (`"turn": "depart"`, la via da cui si parte), poi una
per ogni incrocio dove si gira, si cambia strada o si sceglie a un bivio.

```json
{"node": 2, "point": [46.0671, 11.1344], "distance_m": 1003.6, "turn": "left",
 "angle_deg": -90.0, "street": "Via Manci", "road_type": "residential",
 "branches": 4, "joined": false}
```

`turn` è uno di `depart`, `left`, `right`, `sharp-left`, `sharp-right`,
`straight`, `u-turn`. `street` è il nome della via in cui si entra, o il
suo `ref`, o `null` se OSM non ha né l'uno né l'altro: allora dice
qualcosa solo `road_type`. `joined` è vero quando l'indicazione arriva
meno di 15 m dopo la precedente, da leggere insieme («sinistra, poi
destra»): nessuna si toglie. Le calcola il motore sul grafo su cui ha
tracciato il percorso, in circa 0,1 s.

`along` (TASK-060, ADR-0057) è la via lungo cui corre una strada senza
nome, di solito un marciapiede disegnato a parte: una **deduzione** del
motore (ADR-0054), mai un nome della strada stessa. C'è solo quando
`street` è `null`, altrimenti è `null`; resta `null` anche quando non c'è
una via con nome entro 15 m e parallela (piazze, parchi, viali larghi).

```json
{"node": 3, "point": [46.0761, 11.1344], "distance_m": 2004.4, "turn": "left",
 "angle_deg": -88.5, "street": null, "road_type": "footway",
 "branches": 3, "joined": false, "along": "Via Rosmini"}
```

Le vie accanto vengono dal grafo e dal file dei nomi della zona in cache
(`MAPS.md`, «Cache»); l'API non lo scarica mai durante una richiesta: una
zona senza il file dà solo le vie del grafo. Il campo è opzionale nei tipi
condivisi: un'API precedente non lo manda, e un `GpxRequest` può ometterlo.
Sul cuore da 15 km di Trento le indicazioni senza nome né via passano da
118 a 57, e `along` costa circa 0,3 s.

Le richieste vivono nella memoria dell'API: un riavvio le perde. Lavorano
due alla volta, così un 15 km annullato non ferma la richiesta dopo; le due
però si dividono il processore, quindi la seconda va più piano finché la
prima non finisce.

### Registro delle richieste (TASK-090, ADR-0085)

Serve a rifare uguale un percorso visto nell'app, per capire un difetto:
in TASK-075 non si è potuto, perché la partenza era il GPS del telefono e
25–100 m cambiano il cuore. **Spento per default**; si accende all'avvio:

```
python -m shaperoute_api --lan --request-log
```

oppure con la variabile d'ambiente `SHAPEROUTE_REQUEST_LOG=1`. All'avvio
l'API dice se registra e dove. Il file è `data/requests/requests.jsonl`
(`--request-log-dir` cambia la cartella), fuori dal repository
(`.gitignore`) e leggibile solo da chi ha avviato l'API. Una riga JSON per
ogni richiesta di percorso finita (`/route-jobs`, `/image-route-jobs`,
`/routes`), scritta dopo che il job ha la sua risposta:

```json
{"time": "2026-09-30T13:18:08+00:00", "kind": "shape", "job_id": "d44ecaff13cc",
 "request": {"start": [45.9934, 11.258], "shape": "heart", "word": null,
             "distance_m": 10000, "activity": "running", "style": "round"},
 "outcome": {"status": "done", "distance_m": 11841.8, "similarity": 0.8568,
             "points": 467, "route": "19a2ca915124baf7", "elapsed_s": 7.3}}
```

- `kind`: `shape`, `word` o `image`. `request` è il corpo com'è arrivato,
  con i default scritti; per un'immagine, `outline` e `strokes`.
- `outcome`: `done` con distanza, somiglianza, numero di punti, secondi e
  `route`, un'impronta dei punti (uguale solo se il percorso è lo stesso
  punto per punto); `failed` con il solo `code` dell'errore; `cancelled`
  per un job annullato prima del calcolo. `job_id` è `null` per `/routes`.
- **Mai nel file**: la chiave dell'API, le intestazioni, l'indirizzo del
  telefono, la foto (`/image-outlines` e `/image-outline-edits` non sono
  registrati), i punti del percorso, le parole di `/shape-readings`. Una
  richiesta non valida (422 prima del job) non è registrata.
- **Grandezza**: a 5 MB il file diventa `requests.old.jsonl` (quello di
  prima è sostituito) e ne comincia uno nuovo: mai più di 10 MB sul disco,
  alcune migliaia di richieste.
- Se il file non si può scrivere, la richiesta va avanti lo stesso e nel
  log dell'API c'è un avviso, senza il corpo della richiesta.

**Rifare una richiesta**, senza server e senza telefono, dalla radice del
repository:

```
python -m shaperoute_api.replay --list          # le righe, numerate
python -m shaperoute_api.replay                 # rifà l'ultima
python -m shaperoute_api.replay --job d44ecaff13cc --gpx out/again.gpx
python -m shaperoute_api.replay --line 3
```

Ricostruisce la richiesta dal corpo, con gli stessi controlli di quando è
arrivata, e la dà allo stesso motore sui grafi in cache (`--cache-dir`,
`--file` per un altro registro). Stampa distanza e somiglianza di adesso e
dice se il percorso è quello registrato, punto per punto; se non lo è
(motore cambiato, o altri dati della mappa) esce con codice 1. Provato con
un cuore da 10 km a Caldonazzo e «CIAO» squadrato a Levico: 467 e 626
punti, identici. Il registro contiene le partenze degli utenti: vedi
`UI.md`, «Cosa esce dal telefono», e `DEPLOY.md`.

### `POST /gpx`

Riceve un `GpxRequest`, cioè `{"request": RouteRequest, "result":
RouteResult}`, e risponde `200` con il percorso in GPX 1.1
(`application/gpx+xml`), scritto da `export_gpx.py` del motore come fa la
CLI (`GPX.md`). Il nome del file è nell'intestazione:
`Content-Disposition: attachment; filename="shaperoute-heart-5km-2026-09-23.gpx"`.
L'API non ricorda niente, quindi l'export funziona anche dopo i 10 minuti
di vita di una richiesta in due tempi. Un corpo non valido risponde
`422 invalid_request` (ADR-0033).

### `GET /places`

I luoghi della partenza, suggeriti mentre si scrive (TASK-123, ADR-0095).
`?q=via bel&lat=46.07&lon=11.12`: `q` da 1 a 200 caratteri, `lat` e `lon`
facoltativi, insieme, per mettere prima i luoghi attorno. Risponde `200`
con al più 5 luoghi (`packages/shared-types/fixtures/places.json`):

```json
{ "places": [{ "label": "Via Rodolfo Belenzani, Trento", "point": [46.0692621, 11.1211947] }] }
```

I luoghi vengono dall'autocompletamento di Geoapify (dati OpenStreetMap),
con la chiave `GEOAPIFY_API_KEY` dell'API: l'app non la vede. Le risposte
restano in memoria un'ora (500 ricerche): le stesse lettere non si chiedono
due volte. Senza chiave, o se Geoapify non risponde, `503 http_error`;
l'app allora chiede a Photon, come prima. È un `GET`: non conta nel limite
dei POST al minuto.

### `GET /recommended-routes` (TASK-126, ADR-0098)

I percorsi migliori già pianificati vicino a un punto, per «Explore»:
`?lat=…&lon=…`, facoltativi `radius_m` (100–50 000, default 5000),
`shape` (una forma, o una parola in maiuscolo) e `distance_m`. Prima la
somiglianza più alta; a parità, il più vicino. Tutti, anche se equivalenti
(TASK-092, punto 3). Ogni percorso ha `id`, `city`, `shape` o `word` (con
`style`), `distance_m`, `route_m`, `similarity`, `start`, `away_m` e
`preview`, al più 64 punti della linea per la miniatura. Corpo in
`packages/shared-types/fixtures/recommended-routes.json`. Il punto sta
nella query: il log di accesso non la scrive (ADR-0096).

`GET /recommended-routes/{id}` dà il percorso intero (`points`, `license`;
`recommended-route.json`), 404 per un id che non c'è.

I percorsi vengono da `catalog/seed/` (ADR-0097), letti all'avvio:
`--catalog-dir` per un'altra cartella; senza file la lista è vuota. Un file
nuovo vuole un riavvio dell'API.

### `GET /cities` (TASK-129, ADR-0099)

Le città di tutto il mondo per nome, `?q=…`, al più 5, ognuna col suo
centro: la geocodifica di Geoapify per sole città (`type=city`), con la
chiave di `/places`. Non l'autocompletamento, che per una città dà il
centro dell'area del comune (Milano: Baggio, 6 km dal Duomo). Corpo come
`/places` (`places.json`); 503 senza chiave. Cache di un giorno. Parole
imparate dal vocabolario (`city_names`, TASK-142) cercano il nome imparato:
«levic» cerca «Levico Terme», non Levič.

### `GET /city-suggestions` (TASK-134, TASK-138, ADR-0110)

Città e luoghi mentre si scrive, `?q=Par` → Paris, Parma; `?q=arena di
ver` → Verona Arena: l'autocompletamento di Geoapify senza `type`, nel suo
ordine. Si tengono le città (`result_type` `city`, col punto della città
come `/cities`) e i luoghi (`amenity`, `building`, `street`, `suburb`,
`district`, solo con un nome); contee, regioni, stati e CAP no (la contea
di Milano ha il punto a Baggio). Due luoghi a meno di 150 m sono lo stesso:
resta il primo. Da 2 lettere (prima: lista vuota), al più 6, un'etichetta
una volta sola; cache di un giorno. 503 senza chiave.

```json
{"places": [
  {"label": "Verona, Veneto, Italy", "point": [45.4385, 10.9924], "kind": "city"},
  {"label": "Verona Arena, Verona, Italy", "point": [45.439, 10.9949], "kind": "place"}
]}
```

`kind` dice all'app se nominare il posto nelle parole di una richiesta
(una città) o mandarne solo il punto (un luogo). Prima di TASK-138 il campo
non c'era: l'app tratta come città una voce senza `kind`.

### `POST /themed-route-jobs` (TASK-129, ADR-0099)

Una forma che passa dai luoghi veri di un tema: `{"text": "voglio un
percorso romantico a Parigi", "centre": [lat, lon] | null, "city": … |
null}`. Risponde 202 con un job, letto con `GET /themed-route-jobs/{id}`
(`queued`, `running`, `done`, `failed`; i corpi in
`themed-route-job-done.json` e `-failed.json`).

- **Le parole**: tema, forma, km e città da tabelle in italiano, inglese
  e francese (`themes.py`); l'AI solo per un tema che le tabelle non
  trovano, e solo fra i temi elencati (`theme_reading.py`). Temi:
  `romantic`, `food`, `famous`, `tourist`, `panoramic`, `nature`,
  `culture`, e da TASK-134 le categorie dell'app: `shopping`, `nightlife`,
  `hidden`, `photography`, `family`, `running`, `walking`, `local`; la forma, se non è detta, quella del tema (cuore per
  `romantic`, stella per i luoghi famosi, cerchio per gli altri); 10 km se
  i km non sono detti, da 3 a 21.
- **La città**: quella nominata nelle parole, cercata come `/cities`;
  altrimenti `centre` dell'app (la città scelta o la partenza).
- **I luoghi**: Geoapify Places, dati OpenStreetMap, con un nome; prima
  quelli con una voce Wikidata, e per i temi «notevoli» solo quelli se
  sono almeno 3. Al più 15, entro un quarto della distanza (0,8–5 km).
  Cache di un giorno per città e tema.
- **Il percorso**: il motore (`route_engine/stops.py`) pianifica la forma
  dal centro e da 3 luoghi dove ce ne sono di più attorno; tiene, fra
  quelle da 0,85 di somiglianza in su, quella che passa a 80 m dal maggior
  numero di luoghi.
- **Il risultato**: `points`, `distance_m`, `similarity`, `shape`,
  `theme`, `city`, `centre` e **tutti** i luoghi trovati con `passed`.
- **Errori del job** (`error.code`): `theme_unknown`, `city_unknown`,
  `no_places` (meno di 2 luoghi verificati: lo dice, non inventa),
  `places_unavailable`, e quelli dei percorsi (`shape_not_drawable`,
  `map_data_unavailable`). 503 se l'API non ha i percorsi a tema.

### `POST /track-scores`

Il punteggio di una corsa (TASK-113, ADR-0093). Riceve un
`TrackScoreRequest`:

```json
{
  "points": [[46.0671, 11.1214], [46.0671, 11.1344]],
  "similarity": 0.91,
  "track": [
    { "point": [46.0671, 11.1214], "time_ms": 1790000000000, "accuracy_m": 6.0 }
  ]
}
```

`points` e `similarity` sono quelli del `RouteResult` del percorso seguito;
`track` sono le posizioni registrate dall'app, in ordine (`accuracy_m` può
mancare o essere `null`). Risponde `200` con un `TrackScoreResult`:
`score` da 0 a 100, `fidelity`, `covered` (quota del percorso corsa),
`on_route` (quota della corsa sul percorso) e `distance_m`, calcolati da
`track_score.py` del motore (`ROUTE_ENGINE.md` §5, ADR-0090). Niente grafo,
niente rete, e l'API non ricorda niente. Una corsa con meno di 2 posizioni
buone o più corta del 10% del percorso risponde `422 invalid_request`, con
il motivo del motore nel messaggio («This run cannot be scored: …»). Al più
20 000 posizioni e 50 000 punti di percorso.

### `POST /signals` (TASK-142, ADR-0112)

Cosa ha fatto l'app con una ricerca, per gli eventi delle ricerche
(`docs/INSIGHTS.md`). Tre corpi, distinti da `kind` (in
`packages/shared-types/fixtures/signals.json`, tipi in
`packages/shared-types/src/signals.ts`):

| `kind` | Campi | Quando |
|---|---|---|
| `city_chosen` | `label`, `point`, `place` (facoltativo), `via`: `suggestion`, `recent`, `featured`, `typed` | una città o un luogo scelto in «Explore» |
| `route_chosen` | `shape` (o `"image"`) o `word`; `index` (0 è A), `of` (1–3), `via`: `start`, `gpx` | il primo uso di un percorso fra quelli offerti |
| `hint_taken` | `shape` o `word`; `hint`: `try_distance` (con `to_m`) o `catalog_shape`; `distance_m` | «Try N km», o una forma del catalogo dopo un percorso fallito |

Risponde sempre `204` a un corpo valido, anche con gli eventi spenti; un
campo in più, una forma fuori catalogo, un indice fuori dai percorsi offerti
o una posizione fuori dalla Terra: `422 invalid_request`. Oltre 60 segnali
al minuto, tutti i client insieme, il segnale non si registra (avviso nel
log). Il `point` si registra come cella di ~1 km; la partenza non c'è mai.

### `POST /route-directions` (TASK-145, ADR-0117)

Le indicazioni di svolta di un percorso che l'app ha solo come punti: uno
di «Explore» (consigliato, esempio di una città o a tema), prima di
«Start». Riceve `{"points": [[lat, lon], …]}`, da 2 a 50 000 punti, la
linea come l'ha disegnata il motore
(`packages/shared-types/fixtures/route-directions-request.json`). Risponde
`200` con `{"directions": [...]}`, le stesse `Direction` di
`RouteResult.directions`, partenza compresa, con gli `along` (ADR-0057)
(`route-directions.json`).

Il grafo è quello della zona, come per i percorsi: in memoria, dalla
cache, o scaricato; si ritaglia 250 m attorno alla linea. I nodi della
linea li ritrova `route_nodes.py` del motore (`ROUTE_ENGINE.md` §4). Una
linea che non segue le strade della mappa risponde `422 invalid_request`
(«The route does not follow the roads of this map.»), una zona che non si
scarica `503 map_data_unavailable`. Niente si salva. Misurato il
2026-10-01 sul Mac, zone in cache: 0,1–0,5 s per percorsi di 5–23 km.

### `POST /shape-readings`

Le parole del riquadro della forma che la tabella dell'app non conosce
(ADR-0012, `AI.md`). Riceve uno `ShapeReadingRequest`:

```json
{ "text": "stemma della Ferrari" }
```

e risponde `200` con uno `ShapeReading`: le parole come lette (spazi
singoli, nessuno ai lati) e una forma del catalogo, o `null` se nessuna va
bene.

```json
{ "text": "stemma della Ferrari", "shape": "horse" }
```

Il testo va da 1 a 60 caratteri: fuori da lì, `422 invalid_request`. Se
Ollama è spento, non ha il modello o non risponde entro 90 s, `503
ai_unavailable`, con il motivo nel messaggio. Le stesse parole, a meno di
maiuscole e spazi, si chiedono al modello una volta sola: l'API le ricorda
finché non si riavvia.

### `POST /routes`

Riceve un `RouteRequest`:

```json
{ "start": [46.0671, 11.1214], "shape": "heart", "distance_m": 5000, "activity": "running" }
```

`start` è `[lat, lon]`; `activity` si può omettere (`running`). Un campo in
più o scritto male è un errore, non si ignora.

Risponde `200` con un `RouteResult`:

```json
{
  "points": [[46.0671, 11.1214], "…", [46.0671, 11.1214]],
  "distance_m": 5230.4,
  "similarity": 0.91,
  "shape": "heart",
  "warnings": ["start moved 250 m south of the requested point, …"],
  "directions": []
}
```

Qui `directions` resta vuoto: le indicazioni arrivano solo con le
richieste in due tempi (sopra). Nel `GpxRequest` si può omettere.

**`alternatives`** (TASK-093, ADR-0087): altri percorsi per la stessa
richiesta, dal migliore, al più 2 (`MAX_ALTERNATIVES`). Ognuno è un
`RouteResult` intero, con i suoi `points`, `distance_m`, `similarity`,
avvisi e, nei job, le sue `directions`; il suo `alternatives` è vuoto. Si
sceglie nell'app: il `GpxRequest` manda poi il risultato scelto, con o
senza il campo. Un'API precedente non lo manda, e l'app mostra il percorso
da solo. Quali entrano: `ROUTE_ENGINE.md`, «Altri percorsi fra cui
scegliere». Il registro delle richieste scrive anche le loro impronte
(`outcome.alternatives`), e il replay le confronta.

La richiesta è sincrona: la risposta arriva quando il percorso è pronto
(tempi sotto). Resta per `/docs`, `curl` e le misure; l'app usa
`/route-jobs`.

### Una parola invece di una forma (TASK-056)

Un `RouteRequest` ha `shape` **oppure** `word`: l'altro manca o è `null`.
Con `word` il motore scrive la parola una lettera alla volta, come la CLI
con `--word` (ADR-0044):

```json
{ "start": [46.0671, 11.1214], "word": "ciao", "distance_m": 15000, "activity": "running" }
```

- Maiuscole o minuscole, solo le lettere dell'alfabeto del motore
  (`route_engine/letters.json`, dalla A alla Z dal TASK-059: niente
  accenti, cifre o spazi), al più 8, e almeno 3 km di percorso per
  lettera: «CIAO» vuole almeno 12 km. Sono `LETTERS`, `MAX_WORD_LETTERS` e
  `LETTER_DISTANCE_M` in `shared-types`, così l'app può controllare prima
  di chiedere. Per «città» il messaggio è `no letter À: a word can use
  only the letters A to Z`.
- Il `RouteResult` ha `"shape": null` e `"word": "CIAO"`, la parola in
  maiuscole; per una forma è il contrario, con `"word": null`.
- Il nome del file GPX usa la parola: `shaperoute-CIAO-15km-2026-09-24.gpx`.
- `style` sceglie le lettere (TASK-080, ADR-0075): `"round"`, il
  predefinito, oppure `"block"`, le lettere squadrate girate sulla griglia
  delle vie (ADR-0072). Solo con una parola: `"block"` con una forma, o uno
  stile che non c'è, è `invalid_request` (`a style is for the letters of a
  word`, `unknown style 'italic'`). Gli stili sono `LETTER_STYLES` in
  `shared-types`; una richiesta d'immagine non ha `style`.
- Una parola chiede più tempo di una forma: 40–140 s per «CIAO» a 15 km,
  quasi sempre con la ricerca fino a 2 km (ADR-0044); con le lettere di
  più tratti di più, fino a 258 s per «BELLO» (ADR-0056).

### Un'immagine invece di una forma (TASK-073)

Due richieste, e il contorno si vede prima del percorso (ADR-0069).

**`POST /image-outlines`** — il motore ricava il contorno dell'immagine
(`route_engine/image_outline.py`, ADR-0068):

```json
{ "image": "/9j/4AAQSkZJRgABAQ…" }
```

`image` è il file PNG o JPEG in base64, dentro il JSON: al più 10 MB prima
della codifica (`MAX_IMAGE_BYTES`), cioè 13 333 336 caratteri. Nessun upload
multipart, che vorrebbe `python-multipart`. La risposta, in meno di 2 s:

```json
{ "points": [[-1.0, -0.8], [1.0, -0.8], [0.0, 0.9], [-1.0, -0.8]],
  "image_points": [[0.1, 0.9], [0.9, 0.9], [0.5, 0.05], [0.1, 0.9]],
  "aspect": 1.0 }
```

- `points`: il contorno chiuso, centrato e scalato in [-1, 1], y in alto,
  al più 100 angoli (`MAX_OUTLINE_POINTS`): è quello che torna indietro
  con la richiesta del percorso.
- `image_points`: gli stessi angoli sopra l'immagine, come frazioni di
  larghezza e altezza dall'angolo in alto a sinistra: l'app ci disegna la
  linea sopra la foto.
- `aspect`: larghezza su altezza dell'immagine, dritta (EXIF).
- `strokes` e `image_strokes` (dal TASK-084 anche per una foto appena
  letta): con più soggetti, fino a 4, ogni soggetto dopo il più grande è
  un tratto, nei due sistemi di `points` e `image_points`. Il primo lato è
  il collegamento, dalla linea già disegnata al soggetto; il resto è il
  contorno del soggetto, che si chiude sul secondo punto. Vuoti con un
  soggetto solo. L'app li disegna e li rimanda senza cambiarli.

Un'immagine che non dà un contorno è rifiutata con `422`
`image_not_usable` e il motivo del motore in `reason`: `format`,
`unreadable`, `background`, `no_subject`, `scattered`, `edge`, `small`,
`jagged` (`IMAGE_REASONS` in `shared-types`). Dal TASK-084 `scattered`
vuol dire più di 4 soggetti: fino a 4 si disegnano. Base64 non valido o
un'immagine oltre il limite sono `invalid_request`.

**`POST /image-route-jobs`** — il percorso del contorno, come `/route-jobs`:

```json
{ "start": [46.0671, 11.1214], "outline": [[-1.0, -0.8], [1.0, -0.8], [0.0, 0.9], [-1.0, -0.8]], "distance_m": 15000, "activity": "running" }
```

- `outline` sono i `points` di `/image-outlines`, senza cambiarli.
  L'immagine non viaggia una seconda volta.
- Il contorno arriva dal telefono e si controlla come ogni input: da 4 a
  101 punti, numeri finiti, dentro [-1, 1], e poi il controllo del motore
  (`parse_outline`: chiuso, almeno 3 punti distinti, senza incroci).
  Altrimenti `422` `invalid_request` con quello che non va
  (`outline: the outline crosses itself: …`).
- Partenza, distanza e attività si controllano come per una forma.
- La risposta è un `RouteJob`: si legge e si annulla su
  `/route-jobs/{job_id}`, come gli altri. Il motore lo disegna come
  `--image` dalla CLI, dritto (ADR-0038); il `RouteResult` ha `"shape":
  null` e `"word": null`. Con la mela di TASK-072 a Trento, 10 km:
  9,2 km, somiglianza 0,94, in 27 s.
- Il GPX si chiede a `POST /gpx` con questa richiesta al posto del
  `RouteRequest`; il file si chiama `shaperoute-image-15km-2026-09-26.gpx`.
- `strokes` (dal TASK-079, facoltativo): gli altri soggetti della foto
  (TASK-084) e i dettagli disegnati a mano, gli `strokes` di un
  `ImageOutline`, senza cambiarli. Si controllano come il contorno: numeri
  finiti, dentro [-1, 1], al più 200 punti **percorsi** in tutto
  (`MAX_DETAIL_POINTS`): un anello conta una volta, un tratto andata e
  ritorno due, quindi circa 100 punti di dettagli senza anello; poi `parse_outline` con i
  dettagli (ognuno parte dalla linea o da un dettaglio prima; possono
  incrociarsi e incrociare il contorno). Il percorso segue ogni dettaglio e torna indietro.

### Modificare il contorno (TASK-079)

**`POST /image-outline-edits`** — una parte o un dettaglio disegnati col
dito sull'anteprima (ADR-0074). L'API non tiene niente fra due modifiche:
l'app manda il contorno che mostra e la linea disegnata.

```json
{ "image_points": [[0.1, 0.9], [0.9, 0.9], [0.5, 0.05], [0.1, 0.9]],
  "image_strokes": [],
  "aspect": 1.0,
  "kind": "detail",
  "line": [[0.5, 0.88], [0.5, 0.7], [0.5, 0.5]] }
```

- `image_points`, `image_strokes`, `aspect`: quelli dell'`ImageOutline`
  mostrato; `line`: la linea disegnata, come frazioni della foto
  dall'angolo in alto a sinistra, da 2 a 2000 punti.
- `kind`: `part`, una linea chiusa: a cavallo del contorno si unisce alla
  sagoma, altrove (dentro o fuori) resta un anello appeso alla linea più
  vicina; `detail`, una linea che il percorso fa andata e ritorno: parte
  dal contorno (o da un dettaglio) se comincia lì vicino, altrimenti il
  motore la collega alla linea più vicina. Dove si incrocia da sola chiude
  un anello, come un occhio.
- La risposta è un `ImageOutline`, con in più `strokes` (nella cornice di
  `points`) e `image_strokes` (sopra la foto). `/image-outlines` li dà
  vuoti.
- Un disegno che non dà una linea sola è `422` `outline_edit_rejected`, con
  il motivo del motore in `reason`: `short`, `covers_detail`, `too_many_corners`
  (`EDIT_REASONS` in `shared-types`). Punti fuori da [0, 1], un contorno
  non valido o `aspect` fuori da 1/20–20 sono `invalid_request`.
- «Undo» è dell'app: torna al contorno di prima, senza chiamare l'API.

### Account (TASK-114, ADR-0120)

Email e password (ADR-0114), nel database di `DATABASE.md` (ADR-0115).
Tipi e esempi in `shared-types` (`SignUpRequest`, `SignInRequest`,
`Session`, `User`; `fixtures/sign-up-request.json`, `fixtures/session.json`).

| Endpoint | Cosa | Risposta |
|---|---|---|
| `POST /accounts` | iscriversi: `email`, `password`, `username`, `at_least_16` | `201` `Session`: iscriversi fa anche entrare |
| `POST /session` | entrare: `email`, `password` | `200` `Session` |
| `DELETE /session` | uscire, solo da questo telefono | `204` |
| `GET /me` | chi sono | `200` `User` |
| `DELETE /me` | cancellare l'account e tutto ciò che è suo, subito | `204` |

- `Session` è `{ "token": "…", "user": User }`; `User` è `id`, `email`,
  `username`, `role` (`user` o `admin`) e `created_at`. Il token è l'unica
  cosa segreta che l'API dà, e solo qui: l'app lo tiene in
  `expo-secure-store` e lo rimanda come `Authorization: Bearer <token>` a
  `GET /me`, `DELETE /session`, `DELETE /me` e agli endpoint che verranno
  (la dipendenza `current_user` di `accounts.py`).
- L'email si salva in minuscolo; la password da 8 a 128 caratteri; il nome
  da 3 a 20 fra lettere, cifre, `_` e `.`, unico senza badare alle
  maiuscole. `at_least_16` falso è `422 invalid_request` (ADR-0114, punto
  6). Campi in più, come `role`, sono `invalid_request`.
- La password resta solo come hash Argon2id; del token il database tiene
  solo lo SHA-256. Né l'una né l'altro finiscono nei log.
- Una sessione finisce 90 giorni dopo l'ultimo uso (`session_expired`, una
  volta, poi `not_signed_in`) o con `DELETE /session`. Ogni telefono ha la
  sua: uscire da uno non fa uscire gli altri.
- Password sbagliata ed email sconosciuta danno lo stesso
  `401 wrong_credentials`, nello stesso tempo. Dopo 5 password sbagliate in
  15 minuti per la stessa email, `429 too_many_requests` con `Retry-After`,
  anche con quella giusta. Il limite dei POST di `SHAPEROUTE_RATE_LIMIT`
  vale in più.

## Eventi delle ricerche (TASK-130, ADR-0101)

Ogni ricerca e ogni segnale d'uso lascia un evento in `data/insights/`
(spento con `--no-insights`); `--insights-dir` e `--vocabulary` cambiano
cartella e vocabolario. Il funzionamento, i comandi e la privacy sono in
`docs/INSIGHTS.md`. Le risposte degli endpoint non cambiano, tranne
`/cities` corretto dal vocabolario; i segnali dell'app arrivano da
`POST /signals` (TASK-142).

## Errori

Ogni errore ha la stessa forma, con un messaggio in inglese come quelli
del motore:

```json
{ "error": { "code": "shape_not_drawable", "message": "a 7 km heart cannot be drawn here: …", "suggested_distance_m": 4000, "reason": null } }
```

`suggested_distance_m` c'è in ogni errore ed è `null` tranne con
`shape_not_drawable`, quando il percorso migliore seguiva la forma ma
mancava la distanza: è la sua lunghezza, al km intero, fra 1 e 50 km
(ADR-0041). Se il motivo è la somiglianza bassa resta `null`.
`reason` c'è in ogni errore dal TASK-073 ed è `null` tranne con
`image_not_usable` e `outline_edit_rejected` (TASK-079): il motivo del
motore, in una parola.

| Caso | HTTP | `code` |
|---|---|---|
| JSON malformato, campo mancante, in più o fuori limite | 422 | `invalid_request` |
| `shape` e `word` insieme o nessuno; una lettera che l'alfabeto non ha; più di 8 lettere; meno di 3 km a lettera; `style` sconosciuto o `"block"` con una forma | 422 | `invalid_request` |
| `/track-scores`: corsa troppo corta per un punteggio, `similarity` fuori da 0–1, troppe posizioni | 422 | `invalid_request` |
| Forma non disponibile in quella zona (ADR-0025) | 422 | `shape_not_drawable` |
| Zona non in cache e dati OSM non scaricabili | 503 | `map_data_unavailable` |
| Il modello che legge le parole della forma non risponde (`AI.md`) | 503 | `ai_unavailable` |
| Un'immagine senza un contorno chiaro (TASK-073) | 422 | `image_not_usable` |
| Una linea disegnata che non dà un contorno solo (TASK-079) | 422 | `outline_edit_rejected` |
| Immagine non in base64 o oltre 10 MB; contorno di `/image-route-jobs` non valido | 422 | `invalid_request` |
| Il motore viola le sue regole (ADR-0026) o altro imprevisto | 500 | `engine_error` |
| Indirizzo o metodo sbagliato | 404, 405 | `http_error` |
| Con `SHAPEROUTE_API_KEY` impostata: `X-API-Key` mancante o sbagliata (TASK-081) | 401 | `unauthorized` |
| Più di `SHAPEROUTE_RATE_LIMIT` POST in un minuto dallo stesso client (default 30; `Retry-After` in secondi) | 429 | `too_many_requests` |
| Account: 5 password sbagliate in 15 minuti per la stessa email (`Retry-After` in secondi) | 429 | `too_many_requests` |
| Account: iscrizione con un'email già usata | 409 | `email_taken` |
| Account: iscrizione con un nome già usato, anche con altre maiuscole | 409 | `username_taken` |
| Account: email o password sbagliate | 401 | `wrong_credentials` |
| Account: nessun token, o uno di una sessione chiusa | 401 | `not_signed_in` |
| Account: sessione non usata da 90 giorni | 401 | `session_expired` |
| Account: l'API non ha un database (`SHAPEROUTE_DATABASE_URL`) | 503 | `accounts_unavailable` |

Forma e codici sono anche nel contratto condiviso con l'app: `ApiError` e
`API_ERROR_CODES` in `shared-types` (ADR-0031). Un codice nuovo va aggiunto
in tutti e due i posti, e i test lo controllano.

I limiti di distanza, forme, parole e attività stanno solo in
`models.py` del route-engine: Pydantic controlla i tipi, il `RouteRequest` del motore i
valori. Per `engine_error` il messaggio è generico e il dettaglio va nel
log dell'API, non al telefono.

## Grafi

L'API non salva i ritagli dei grafi, come invece fa la CLI (ADR-0023): da
3 a 110 MB per ogni partenza nuova avrebbero riempito il disco. Tiene in
memoria gli ultimi 2 grafi di zona e ne ritaglia uno nuovo per ogni
richiesta. Una zona non in cache si scarica e si salva come con la CLI,
anche se la richiesta viene annullata durante il download: una zona pesa
circa 40 MB fra GraphML e pickle, e OSMnx tiene le risposte di Overpass
in `data/cache/http/` (244 MB il 2026-09-23).

C'è un lucchetto per zona (ADR-0032): mentre si scarica una zona, le
richieste per le altre zone non aspettano.

Il log dell'API dice per ogni richiesta da dove veniva il grafo (memoria,
disco o rete), quanto è durata e com'è andata. La posizione di partenza
non entra nel log.

## Tempi

Misurati il 2026-09-23 sul PC di sviluppo, da `curl` su `127.0.0.1`, con i
grafi già in cache; ogni caso chiesto due volte di seguito.

| Caso (5 km) | 1ª richiesta | 2ª richiesta | Risultato |
|---|---|---|---|
| Trento, cuore | 32,4 s | 24,7 s | 3866 m, somiglianza 0,89 |
| Trento, cerchio | 14,8 s | 12,6 s | 5152 m, 0,94 |
| Levico, cuore | 7,9 s | 7,7 s | 6570 m, 0,87 |
| Levico, cerchio | 7,5 s | 7,2 s | 4242 m, 0,74 |
| Trento, cerchio da una partenza nuova (46.0702, 11.1263) | 28,6 s | 20,2 s | 4725 m, 0,90 |

Quasi tutto il tempo è il calcolo del motore: il grafo pesa da 0,1 a 1,4 s
quando è in memoria. Pesa di più la prima volta: fino a 5 s per un ritaglio
già su disco, 10 s per leggere il GraphML di una zona senza pickle. I
quattro casi di riferimento trovano su disco il ritaglio esatto salvato
dalla CLI; una partenza nuova usa il grafo della zona, com'è per l'app.

La prima lettura di una zona senza pickle lo scrive accanto al GraphML
(11 MB per Trento), una volta sola, come fa la CLI. Nessun altro file
compare in `data/cache/`.

Tutti i casi stanno sotto i 60 s dopo i quali iOS tende a chiudere una
richiesta ferma; il cuore di Trento sfiora i 30 s dell'MVP (`PRODUCT.md`).

Con la ricerca del posto (TASK-038, ADR-0040), misurati il 2026-09-24 dal
motore, zone in cache, ogni caso due volte: gatto e pesce da 15 km a Levico
12–14 s, stella da 10 km a Levico 7–10 s, tutti spostati di 1 km; cuore da
15 km a Trento 47–52 s, perché prima finisce la ricerca vicina. Il primo
secondo tempo che non trova la zona la scarica (Levico: 42 s in più); lo
stato del job passa da `computing` a `downloading_map` e torna `computing`.

Dal telefono (TASK-023, PC sull'hotspot dell'iPhone) i casi fino a 10 km
nelle zone in cache hanno risposto in 5–25 s. Non stanno nei 60 s:
- **15 km**, sempre: circa 14 s per ritagliare la zona, anche dalla
  memoria, e circa 50 s di calcolo;
- **una zona nuova**: 72–100 s solo per scaricarla da Overpass sui dati
  mobili; una volta è fallita dopo 22 s (503).

Con le richieste in due tempi (TASK-025), sul PC di sviluppo:
- cerchio da 15 km a Trento, zona già in cache: accettato subito, finito
  in **31 s** (3,8 s di grafo, 26 s di calcolo; 15,9 km, somiglianza
  0,82). Nella prova sull'iPhone lo stesso caso era arrivato a 50 s di
  calcolo perché due 15 km giravano insieme;
- un 5 km chiesto subito dopo aver annullato un 15 km ancora in download:
  pronto in 18 s, senza aspettare l'altro.

### Oltre 15 km (TASK-026)

Misurati il 2026-09-23 sul PC di sviluppo, dalla partenza di Trento, con
`/route-jobs` su `127.0.0.1`, una richiesta alla volta. Le zone le ha
scaricate uno script usa-e-getta, con l'indirizzo di Overpass che risponde
(`MAPS.md`); ogni zona serve sia al cuore sia al cerchio.

| Zona | Area | Download | Su disco |
|---|---|---|---|
| 21 km | 16,7 × 16,7 km = 280 km² | 105 s | 55 MB (38 GraphML, 17 pickle), più 21 MB di risposta di Overpass |
| 30 km | 23 × 23 km = 530 km² | 279 s | 82 MB (57 GraphML, 25 pickle), più 33 MB di risposta di Overpass |

| Caso | 1ª richiesta | 2ª richiesta | Risultato |
|---|---|---|---|
| 21 km, cuore | 42 s | 47 s | 20,7 km, somiglianza 0,86 |
| 21 km, cerchio | 44 s | 36 s | 21,0 km, 0,82 |
| 30 km, cuore | 31 s | 28 s | `shape_not_drawable`: il migliore è 2,7 km più corto |
| 30 km, cerchio | 42 s | 41 s | 30,2 km, 0,90 |

Il grafo pesa 6–7 s dal disco e 2,5–4 s dalla memoria; il resto è il
calcolo, che cresce poco con la distanza. L'API con le due zone in memoria
occupa circa 400 MB. Quello che cresce è il **download** di una zona
nuova: 105 s a 21 km, 279 s a 30 km, già quasi i 5 minuti che l'app
aspetta prima del calcolo. Per questo l'app arriva a 21 km (ADR-0034):
anche in una zona nuova il percorso arriva in circa due minuti e mezzo. Sui
dati mobili il download è più lento (72–100 s per un 15 km, TASK-023).

### Dove va il tempo (TASK-063)

Misurato il 2026-09-25 dal motore, zone in cache, cuore e cerchio a 10, 15
e 21 km (numeri per fase in `tasks/TASK-063.md`). Quel giorno il PC era più
carico che nelle misure sopra: i totali assoluti vengono più alti, il
confronto prima/dopo vale. Più di metà del tempo era il **corridoio**, il
costo di ogni strada ricalcolato a ogni tracciato: reso da 1,3 a 4,5 volte
più veloce a percorsi identici (ADR-0059), Trento da 15 a 21 km è passata
da 80–97 s a 35–64 s. Sopra i 30 s restano la **seconda ricerca** fino a
2 km (ADR-0040), che a Trento corre quasi sempre, e a Milano il
**ritaglio** della zona dalla memoria, 6–13 s a richiesta.

### Il ritaglio (TASK-087)

Dal 2026-09-30 il ritaglio lo fa `ZoneCrop` (`route_engine/zone_crop.py`,
ADR-0082): lo stesso grafo di `network.crop`, nello stesso ordine, senza
passare dalle viste di NetworkX e col garbage collector sospeso. Ogni
richiesta ha ancora il suo grafo. Misurato su un Mac (non il PC delle
misure sopra), zona di Milano già in memoria: da 1,7–5,6 s a 0,3–1,0 s a
richiesta fra 10 e 21 km, percorsi identici punto per punto
(`tasks/TASK-087.md`). A Levico era già sotto il mezzo secondo.

## Domande ancora aperte

- Motore lento sulle distanze lunghe: 30–45 s da 15 a 30 km, più se lavora
  insieme a un'altra richiesta (`STATUS.md`).
- Zone oltre i 21 km: il download da Overpass supera i minuti che l'app
  aspetta; si ripensa con ADR-0009.
- Autenticazione, limiti di richieste, versione, HTTPS, deploy: fase 4.
- Motore di routing di produzione: ADR-0009, rinviata alla fase 4.
